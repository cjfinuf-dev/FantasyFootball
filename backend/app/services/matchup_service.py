"""Matchup management: schedule generation, scoring, week finalization."""

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeagueMember
from app.models.matchup import Matchup
from app.models.player import Player, PlayerStats
from app.models.roster import Roster, RosterPlayer
from app.models.user import User
from app.services.roster_service import require_league_member
from app.utils.scoring import calculate_points


async def generate_schedule(db: AsyncSession, league_id: uuid.UUID, weeks: int = 14) -> list[Matchup]:
    """Generate a round-robin schedule using the circle method."""
    members_result = await db.execute(
        select(LeagueMember).where(LeagueMember.league_id == league_id)
    )
    members = list(members_result.scalars().all())

    if len(members) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 teams for a schedule")

    # Check if schedule already exists
    existing = await db.execute(
        select(Matchup).where(Matchup.league_id == league_id).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Schedule already generated for this league")

    member_ids = [m.id for m in members]
    n = len(member_ids)

    # If odd number of teams, add a "bye" placeholder
    if n % 2 == 1:
        member_ids.append(None)
        n += 1

    # Circle method: fix first team, rotate rest
    matchups = []
    fixed = member_ids[0]
    rotating = member_ids[1:]

    for week in range(1, weeks + 1):
        round_idx = (week - 1) % (n - 1)

        # Rotate the list
        rotated = rotating[round_idx:] + rotating[:round_idx]

        # Pair: fixed vs first of rotated, then pairs from both ends
        week_pairs = []
        week_pairs.append((fixed, rotated[0]))
        for i in range(1, n // 2):
            week_pairs.append((rotated[i], rotated[n - 1 - i]))

        for team_a, team_b in week_pairs:
            if team_a is None or team_b is None:
                continue  # bye week
            matchups.append(Matchup(
                league_id=league_id,
                week=week,
                team_a_id=team_a,
                team_b_id=team_b,
            ))

    db.add_all(matchups)
    await db.commit()
    return matchups


async def get_matchups_for_week(
    db: AsyncSession, user: User, league_id: uuid.UUID, week: int,
) -> list[dict]:
    """Get all matchups for a given week with team names."""
    await require_league_member(db, league_id, user.id)

    # Get member name lookup
    members_result = await db.execute(
        select(LeagueMember).where(LeagueMember.league_id == league_id)
    )
    name_map = {m.id: m.team_name for m in members_result.scalars().all()}

    result = await db.execute(
        select(Matchup).where(
            Matchup.league_id == league_id,
            Matchup.week == week,
        ).order_by(Matchup.id)
    )

    return [
        {
            "id": m.id,
            "week": m.week,
            "team_a_id": m.team_a_id,
            "team_b_id": m.team_b_id,
            "team_a_name": name_map.get(m.team_a_id, "Unknown"),
            "team_b_name": name_map.get(m.team_b_id, "Unknown"),
            "team_a_score": float(m.team_a_score),
            "team_b_score": float(m.team_b_score),
            "is_playoff": m.is_playoff,
            "is_complete": m.is_complete,
        }
        for m in result.scalars().all()
    ]


async def get_matchup_detail(db: AsyncSession, user: User, league_id: uuid.UUID, matchup_id: uuid.UUID) -> dict:
    """Get detailed matchup with both team rosters and player-level scoring."""
    await require_league_member(db, league_id, user.id)

    matchup = await db.get(Matchup, matchup_id)
    if not matchup or matchup.league_id != league_id:
        raise HTTPException(status_code=404, detail="Matchup not found")

    league = await db.get(League, league_id)
    scoring_type = league.scoring_type if league else "ppr"

    # Get team names
    member_a = await db.get(LeagueMember, matchup.team_a_id)
    member_b = await db.get(LeagueMember, matchup.team_b_id)

    matchup_data = {
        "id": matchup.id,
        "week": matchup.week,
        "team_a_id": matchup.team_a_id,
        "team_b_id": matchup.team_b_id,
        "team_a_name": member_a.team_name if member_a else "Unknown",
        "team_b_name": member_b.team_name if member_b else "Unknown",
        "team_a_score": float(matchup.team_a_score),
        "team_b_score": float(matchup.team_b_score),
        "is_playoff": matchup.is_playoff,
        "is_complete": matchup.is_complete,
    }

    team_a_roster = await _get_roster_with_points(db, league_id, matchup.team_a_id, matchup.week, scoring_type)
    team_b_roster = await _get_roster_with_points(db, league_id, matchup.team_b_id, matchup.week, scoring_type)

    return {
        "matchup": matchup_data,
        "team_a_roster": team_a_roster,
        "team_b_roster": team_b_roster,
    }


async def calculate_matchup_scores(db: AsyncSession, league_id: uuid.UUID, week: int) -> list[Matchup]:
    """Calculate scores for all matchups in a given week from starter stats."""
    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    scoring_type = league.scoring_type

    matchups_result = await db.execute(
        select(Matchup).where(Matchup.league_id == league_id, Matchup.week == week)
    )
    matchups = list(matchups_result.scalars().all())

    for matchup in matchups:
        matchup.team_a_score = await _calculate_team_score(db, league_id, matchup.team_a_id, week, scoring_type)
        matchup.team_b_score = await _calculate_team_score(db, league_id, matchup.team_b_id, week, scoring_type)

    await db.commit()
    return matchups


async def finalize_week(db: AsyncSession, user: User, league_id: uuid.UUID, week: int) -> list[dict]:
    """Mark all matchups for a week as complete. Commissioner only."""
    league = await db.get(League, league_id)
    if not league or league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can finalize a week")

    # Score first
    await calculate_matchup_scores(db, league_id, week)

    matchups_result = await db.execute(
        select(Matchup).where(Matchup.league_id == league_id, Matchup.week == week)
    )
    matchups = list(matchups_result.scalars().all())

    for m in matchups:
        m.is_complete = True

    await db.commit()
    return await get_matchups_for_week(db, user, league_id, week)


# ─── Helpers ──────────────────────────────────────────────────────────

async def _calculate_team_score(
    db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID, week: int, scoring_type: str,
) -> float:
    """Sum fantasy points for a team's starters in a given week."""
    roster_result = await db.execute(
        select(Roster).where(Roster.league_id == league_id, Roster.member_id == member_id)
    )
    roster = roster_result.scalar_one_or_none()
    if not roster:
        return 0.0

    # Get starters only (non-bench players)
    rp_result = await db.execute(
        select(RosterPlayer).where(RosterPlayer.roster_id == roster.id)
    )
    starters = [rp for rp in rp_result.scalars().all() if not rp.slot.startswith("BN")]

    total = 0.0
    for rp in starters:
        stats_result = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == rp.player_id,
                PlayerStats.week == week,
            )
        )
        stats_row = stats_result.scalar_one_or_none()
        if stats_row:
            total += calculate_points(stats_row.stats, scoring_type)

    return round(total, 2)


async def _get_roster_with_points(
    db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID, week: int, scoring_type: str,
) -> list[dict]:
    """Get a team's roster players with per-player points for a week."""
    roster_result = await db.execute(
        select(Roster).where(Roster.league_id == league_id, Roster.member_id == member_id)
    )
    roster = roster_result.scalar_one_or_none()
    if not roster:
        return []

    rp_result = await db.execute(
        select(RosterPlayer, Player)
        .join(Player, Player.id == RosterPlayer.player_id)
        .where(RosterPlayer.roster_id == roster.id)
    )

    players = []
    for rp, player in rp_result.all():
        points = 0.0
        stats_result = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == player.id,
                PlayerStats.week == week,
            )
        )
        stats_row = stats_result.scalar_one_or_none()
        if stats_row:
            points = calculate_points(stats_row.stats, scoring_type)

        players.append({
            "player_id": player.id,
            "full_name": player.full_name,
            "position": player.position,
            "team": player.team,
            "slot": rp.slot,
            "points_this_week": round(points, 2),
            "acquired_via": rp.acquired_via,
        })

    return players
