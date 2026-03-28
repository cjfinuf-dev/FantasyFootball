"""Roster management: view, set lineup, add/drop players."""

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeagueMember
from app.models.player import Player, PlayerStats
from app.models.roster import Roster, RosterPlayer
from app.models.user import User
from app.utils.scoring import calculate_points

# Slots that each position is eligible for
SLOT_ELIGIBILITY: dict[str, set[str]] = {
    "QB": {"QB", "SUPERFLEX"},
    "RB": {"RB", "FLEX", "SUPERFLEX"},
    "WR": {"WR", "FLEX", "SUPERFLEX"},
    "TE": {"TE", "FLEX", "SUPERFLEX"},
    "K": {"K"},
    "DEF": {"DEF"},
}


async def require_league_member(db: AsyncSession, league_id: uuid.UUID, user_id: uuid.UUID) -> LeagueMember:
    """Verify user is a league member. Raises 403 if not."""
    result = await db.execute(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this league")
    return member


async def get_roster(db: AsyncSession, user: User, league_id: uuid.UUID, week: int | None = None) -> dict:
    """Get the authenticated user's roster with player details."""
    member = await require_league_member(db, league_id, user.id)
    return await _build_roster_response(db, league_id, member, week)


async def get_all_rosters(db: AsyncSession, user: User, league_id: uuid.UUID, week: int | None = None) -> list[dict]:
    """Get all rosters in the league."""
    await require_league_member(db, league_id, user.id)

    members_result = await db.execute(
        select(LeagueMember, User.username)
        .join(User, User.id == LeagueMember.user_id)
        .where(LeagueMember.league_id == league_id)
    )

    rosters = []
    for member, username in members_result.all():
        roster_data = await _build_roster_response(db, league_id, member, week)
        roster_data["username"] = username
        rosters.append(roster_data)
    return rosters


async def set_lineup(db: AsyncSession, user: User, league_id: uuid.UUID, lineup: dict[str, str]) -> dict:
    """Set lineup by reassigning player slots. lineup = {slot: player_id}."""
    member = await require_league_member(db, league_id, user.id)

    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    roster = await _get_roster(db, league_id, member.id)
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")

    # Get all roster players
    rp_result = await db.execute(
        select(RosterPlayer, Player.position)
        .join(Player, Player.id == RosterPlayer.player_id)
        .where(RosterPlayer.roster_id == roster.id)
    )
    roster_players = {rp.player_id: (rp, pos) for rp, pos in rp_result.all()}

    # Validate the lineup
    used_players = set()
    for slot, player_id in lineup.items():
        if player_id in used_players:
            raise HTTPException(status_code=400, detail=f"Player {player_id} assigned to multiple slots")
        used_players.add(player_id)

        if player_id not in roster_players:
            raise HTTPException(status_code=400, detail=f"Player {player_id} is not on your roster")

        _, position = roster_players[player_id]
        base_slot = slot.rstrip("0123456789")  # "RB2" → "RB", "BN3" → "BN"

        if base_slot == "BN":
            continue  # Any player can go to bench

        eligible = SLOT_ELIGIBILITY.get(position, set())
        if base_slot not in eligible:
            raise HTTPException(status_code=400, detail=f"{position} cannot be placed in {slot} slot")

    # Apply the lineup changes
    for slot, player_id in lineup.items():
        rp, _ = roster_players[player_id]
        rp.slot = slot

    await db.commit()
    return await _build_roster_response(db, league_id, member)


async def add_player(db: AsyncSession, user: User, league_id: uuid.UUID, player_id: str) -> dict:
    """Add a free agent to the user's bench."""
    member = await require_league_member(db, league_id, user.id)

    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Verify player exists
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Verify player isn't on another roster in this league
    existing = await db.execute(
        select(RosterPlayer)
        .join(Roster, Roster.id == RosterPlayer.roster_id)
        .where(Roster.league_id == league_id, RosterPlayer.player_id == player_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Player is already on a roster in this league")

    roster = await _get_roster(db, league_id, member.id)
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")

    # Check for open bench spot
    current_count = await db.execute(
        select(RosterPlayer).where(RosterPlayer.roster_id == roster.id)
    )
    current_players = list(current_count.scalars().all())
    total_slots = sum(league.roster_slots.values())

    if len(current_players) >= total_slots:
        raise HTTPException(status_code=400, detail="Roster is full. Drop a player first.")

    # Find next bench slot number
    bench_slots = [rp.slot for rp in current_players if rp.slot.startswith("BN")]
    next_bn = len(bench_slots) + 1

    db.add(RosterPlayer(
        roster_id=roster.id,
        player_id=player_id,
        slot=f"BN{next_bn}",
        acquired_via="free_agent",
    ))
    await db.commit()
    return await _build_roster_response(db, league_id, member)


async def drop_player(db: AsyncSession, user: User, league_id: uuid.UUID, player_id: str) -> dict:
    """Drop a player from the user's roster."""
    member = await require_league_member(db, league_id, user.id)

    roster = await _get_roster(db, league_id, member.id)
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")

    result = await db.execute(
        select(RosterPlayer).where(
            RosterPlayer.roster_id == roster.id,
            RosterPlayer.player_id == player_id,
        )
    )
    rp = result.scalar_one_or_none()
    if not rp:
        raise HTTPException(status_code=400, detail="Player is not on your roster")

    await db.delete(rp)
    await db.commit()
    return await _build_roster_response(db, league_id, member)


# ─── Helpers ──────────────────────────────────────────────────────────

async def _get_roster(db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID) -> Roster | None:
    result = await db.execute(
        select(Roster).where(Roster.league_id == league_id, Roster.member_id == member_id)
    )
    return result.scalar_one_or_none()


async def _build_roster_response(
    db: AsyncSession, league_id: uuid.UUID, member: LeagueMember, week: int | None = None,
) -> dict:
    roster = await _get_roster(db, league_id, member.id)
    if not roster:
        return {
            "id": None, "league_id": league_id, "member_id": member.id,
            "team_name": member.team_name, "players": [],
        }

    league = await db.get(League, league_id)
    scoring_type = league.scoring_type if league else "ppr"

    rp_result = await db.execute(
        select(RosterPlayer, Player)
        .join(Player, Player.id == RosterPlayer.player_id)
        .where(RosterPlayer.roster_id == roster.id)
    )

    players = []
    for rp, player in rp_result.all():
        points = 0.0
        if week:
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

    return {
        "id": roster.id,
        "league_id": league_id,
        "member_id": member.id,
        "team_name": member.team_name,
        "players": players,
    }
