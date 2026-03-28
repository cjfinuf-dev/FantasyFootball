"""League business logic — create, join, leave, update, members, standings."""

import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeagueMember
from app.models.matchup import Matchup
from app.models.user import User
from app.schemas.league import LeagueCreate, LeagueUpdate, DEFAULT_ROSTER_SLOTS


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(8)[:10].upper()


async def create_league(db: AsyncSession, user: User, data: LeagueCreate) -> League:
    league = League(
        name=data.name,
        season=data.season,
        num_teams=data.num_teams,
        scoring_type=data.scoring_type,
        roster_slots=data.roster_slots or DEFAULT_ROSTER_SLOTS,
        waiver_type=data.waiver_type,
        faab_budget=data.faab_budget,
        trade_deadline=data.trade_deadline,
        playoff_teams=data.playoff_teams,
        commissioner_id=user.id,
        invite_code=_generate_invite_code(),
    )
    db.add(league)
    await db.flush()

    # Commissioner auto-joins
    member = LeagueMember(
        league_id=league.id,
        user_id=user.id,
        team_name=f"{user.username}'s Team",
        role="commissioner",
    )
    db.add(member)
    await db.commit()
    await db.refresh(league)
    return league


async def get_user_leagues(db: AsyncSession, user: User) -> list[League]:
    result = await db.execute(
        select(League)
        .join(LeagueMember, LeagueMember.league_id == League.id)
        .where(LeagueMember.user_id == user.id)
        .order_by(League.created_at.desc())
    )
    return list(result.scalars().all())


async def get_league_by_id(db: AsyncSession, league_id: uuid.UUID) -> League:
    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


async def update_league(db: AsyncSession, user: User, league_id: uuid.UUID, data: LeagueUpdate) -> League:
    league = await get_league_by_id(db, league_id)
    if league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can update league settings")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(league, field, value)

    await db.commit()
    await db.refresh(league)
    return league


async def join_league_by_id(db: AsyncSession, user: User, league_id: uuid.UUID) -> LeagueMember:
    league = await get_league_by_id(db, league_id)
    return await _join_league(db, user, league)


async def join_league_by_code(db: AsyncSession, user: User, invite_code: str) -> LeagueMember:
    result = await db.execute(select(League).where(League.invite_code == invite_code))
    league = result.scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return await _join_league(db, user, league)


async def _join_league(db: AsyncSession, user: User, league: League) -> LeagueMember:
    # Check if already a member
    existing = await db.execute(
        select(LeagueMember).where(
            LeagueMember.league_id == league.id,
            LeagueMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member of this league")

    # Check capacity
    count = await db.execute(
        select(func.count()).select_from(LeagueMember).where(LeagueMember.league_id == league.id)
    )
    if count.scalar_one() >= league.num_teams:
        raise HTTPException(status_code=400, detail="League is full")

    if league.status != "pre_draft":
        raise HTTPException(status_code=400, detail="Cannot join a league that has already started")

    member = LeagueMember(
        league_id=league.id,
        user_id=user.id,
        team_name=f"{user.username}'s Team",
        role="member",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def leave_league(db: AsyncSession, user: User, league_id: uuid.UUID) -> None:
    league = await get_league_by_id(db, league_id)

    result = await db.execute(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=400, detail="Not a member of this league")

    if member.role == "commissioner":
        raise HTTPException(status_code=400, detail="Commissioner cannot leave. Transfer ownership first or delete the league.")

    if league.status != "pre_draft":
        raise HTTPException(status_code=400, detail="Cannot leave a league that has already started")

    await db.delete(member)
    await db.commit()


async def get_league_members(db: AsyncSession, league_id: uuid.UUID) -> list[dict]:
    result = await db.execute(
        select(LeagueMember, User.username)
        .join(User, User.id == LeagueMember.user_id)
        .where(LeagueMember.league_id == league_id)
        .order_by(LeagueMember.joined_at)
    )
    members = []
    for member, username in result.all():
        members.append({
            "id": member.id,
            "league_id": member.league_id,
            "user_id": member.user_id,
            "team_name": member.team_name,
            "role": member.role,
            "joined_at": member.joined_at,
            "username": username,
        })
    return members


async def set_team_name(db: AsyncSession, user: User, league_id: uuid.UUID, team_name: str) -> LeagueMember:
    result = await db.execute(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=400, detail="Not a member of this league")
    member.team_name = team_name
    await db.commit()
    await db.refresh(member)
    return member


async def get_standings(db: AsyncSession, league_id: uuid.UUID) -> list[dict]:
    """Calculate W-L-T standings from matchups."""
    members_result = await db.execute(
        select(LeagueMember, User.username)
        .join(User, User.id == LeagueMember.user_id)
        .where(LeagueMember.league_id == league_id)
    )

    standings = {}
    for member, username in members_result.all():
        standings[member.id] = {
            "member_id": member.id,
            "team_name": member.team_name,
            "username": username,
            "wins": 0,
            "losses": 0,
            "ties": 0,
            "points_for": 0.0,
            "points_against": 0.0,
        }

    matchups_result = await db.execute(
        select(Matchup).where(
            Matchup.league_id == league_id,
            Matchup.is_complete == True,
            Matchup.is_playoff == False,
        )
    )
    for m in matchups_result.scalars().all():
        a = standings.get(m.team_a_id)
        b = standings.get(m.team_b_id)
        if not a or not b:
            continue
        a_score = float(m.team_a_score)
        b_score = float(m.team_b_score)
        a["points_for"] += a_score
        a["points_against"] += b_score
        b["points_for"] += b_score
        b["points_against"] += a_score
        if a_score > b_score:
            a["wins"] += 1
            b["losses"] += 1
        elif b_score > a_score:
            b["wins"] += 1
            a["losses"] += 1
        else:
            a["ties"] += 1
            b["ties"] += 1

    return sorted(
        standings.values(),
        key=lambda s: (s["wins"], s["points_for"]),
        reverse=True,
    )


async def delete_league(db: AsyncSession, user: User, league_id: uuid.UUID) -> None:
    league = await get_league_by_id(db, league_id)
    if league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can delete the league")
    if league.status != "pre_draft":
        raise HTTPException(status_code=400, detail="Cannot delete a league that has already started")

    # Delete members first
    await db.execute(
        select(LeagueMember).where(LeagueMember.league_id == league_id)
    )
    members = (await db.execute(
        select(LeagueMember).where(LeagueMember.league_id == league_id)
    )).scalars().all()
    for m in members:
        await db.delete(m)

    await db.delete(league)
    await db.commit()
