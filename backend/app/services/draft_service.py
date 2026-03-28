"""Draft logic: order generation, pick validation, auto-pick on timeout, state machine, roster generation."""

import random
import uuid
import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.draft import Draft, DraftPick
from app.models.league import League, LeagueMember
from app.models.player import Player
from app.models.roster import Roster, RosterPlayer
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_or_create_draft(db: AsyncSession, league_id: uuid.UUID) -> Draft:
    """Get existing draft or create a new one for the league."""
    result = await db.execute(select(Draft).where(Draft.league_id == league_id))
    draft = result.scalar_one_or_none()
    if draft:
        return draft

    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Calculate rounds from roster slots
    total_slots = sum(league.roster_slots.values())

    draft = Draft(
        league_id=league_id,
        rounds=total_slots,
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def get_draft(db: AsyncSession, league_id: uuid.UUID) -> Draft:
    result = await db.execute(select(Draft).where(Draft.league_id == league_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found. Create the draft first.")
    return draft


async def set_draft_settings(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    draft_type: str, pick_time_limit: int, rounds: int,
) -> Draft:
    league = await db.get(League, league_id)
    if not league or league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can change draft settings")

    draft = await get_or_create_draft(db, league_id)
    if draft.status != "scheduled":
        raise HTTPException(status_code=400, detail="Cannot modify a draft that has already started")

    draft.type = draft_type
    draft.pick_time_limit = pick_time_limit
    draft.rounds = rounds
    await db.commit()
    await db.refresh(draft)
    return draft


async def set_draft_order(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    order: list[str] | None = None, randomize: bool = False,
) -> Draft:
    league = await db.get(League, league_id)
    if not league or league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can set draft order")

    draft = await get_or_create_draft(db, league_id)
    if draft.status != "scheduled":
        raise HTTPException(status_code=400, detail="Cannot modify order after draft has started")

    members = await _get_league_members(db, league_id)

    if randomize:
        member_ids = [str(m.id) for m in members]
        random.shuffle(member_ids)
        draft.draft_order = member_ids
    elif order:
        # Validate that all member IDs are valid
        valid_ids = {str(m.id) for m in members}
        if set(order) != valid_ids:
            raise HTTPException(status_code=400, detail="Order must contain exactly all league members")
        draft.draft_order = order
    else:
        raise HTTPException(status_code=400, detail="Provide an order or set randomize=true")

    await db.commit()
    await db.refresh(draft)
    return draft


async def start_draft(db: AsyncSession, user: User, league_id: uuid.UUID) -> Draft:
    league = await db.get(League, league_id)
    if not league or league.commissioner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can start the draft")

    draft = await get_or_create_draft(db, league_id)
    if draft.status != "scheduled":
        raise HTTPException(status_code=400, detail="Draft has already started or is complete")

    members = await _get_league_members(db, league_id)
    if len(members) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 members to draft")

    # Auto-generate order if not set
    if not draft.draft_order:
        member_ids = [str(m.id) for m in members]
        random.shuffle(member_ids)
        draft.draft_order = member_ids

    draft.status = "in_progress"
    draft.current_pick = 1
    draft.started_at = datetime.now(timezone.utc)

    league.status = "drafting"

    await db.commit()
    await db.refresh(draft)
    return draft


async def make_pick(
    db: AsyncSession, user: User, league_id: uuid.UUID, player_id: str,
) -> DraftPick:
    draft = await get_draft(db, league_id)
    if draft.status != "in_progress":
        raise HTTPException(status_code=400, detail="Draft is not in progress")

    # Get the member making the pick
    member = await _get_member_for_user(db, league_id, user.id)
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this league")

    # Validate it's this member's turn
    expected_member_id = _get_picking_member_id(draft)
    if str(member.id) != expected_member_id:
        raise HTTPException(status_code=400, detail="It's not your turn to pick")

    # Validate player isn't already drafted
    existing = await db.execute(
        select(DraftPick).where(
            DraftPick.draft_id == draft.id,
            DraftPick.player_id == player_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Player has already been drafted")

    # Validate player exists
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Calculate round from pick number
    num_teams = len(draft.draft_order)
    current_round = ((draft.current_pick - 1) // num_teams) + 1

    pick = DraftPick(
        draft_id=draft.id,
        member_id=member.id,
        player_id=player_id,
        round=current_round,
        pick_number=draft.current_pick,
    )
    db.add(pick)

    # Advance to next pick
    total_picks = num_teams * draft.rounds
    if draft.current_pick >= total_picks:
        # Draft complete
        draft.status = "complete"
        draft.completed_at = datetime.now(timezone.utc)
        draft.current_pick = total_picks

        # Update league status
        league = await db.get(League, league_id)
        if league:
            league.status = "in_season"

        await db.commit()
        await db.refresh(pick)

        # Generate rosters from draft picks, then schedule
        await _generate_rosters(db, draft)
        from app.services.matchup_service import generate_schedule
        try:
            await generate_schedule(db, league_id)
        except Exception:
            logger.warning(f"Schedule generation failed for league {league_id}", exc_info=True)

        # Notify all members draft is complete
        try:
            from app.services.notification_service import notify_many, DRAFT_COMPLETE
            members = await _get_league_members(db, league_id)
            user_ids = []
            for m in members:
                user_ids.append(m.user_id)
            league_name = league.name if league else "your league"
            await notify_many(
                db, user_ids, DRAFT_COMPLETE,
                "Draft Complete!",
                f"The draft in {league_name} is finished. Set your lineup!",
                {"league_id": str(league_id)},
            )
        except Exception:
            logger.warning("Draft completion notification failed", exc_info=True)
    else:
        draft.current_pick += 1
        await db.commit()
        await db.refresh(pick)

    return pick


async def auto_pick(db: AsyncSession, league_id: uuid.UUID) -> DraftPick | None:
    """Auto-pick for the current drafter (highest projected available player for positional need)."""
    draft = await get_draft(db, league_id)
    if draft.status != "in_progress":
        return None

    member_id = _get_picking_member_id(draft)

    # Get already drafted player IDs
    drafted_result = await db.execute(
        select(DraftPick.player_id).where(DraftPick.draft_id == draft.id)
    )
    drafted_ids = {row[0] for row in drafted_result.all()}

    # Get this member's existing picks to determine positional needs
    member_picks = await db.execute(
        select(DraftPick.player_id).where(
            DraftPick.draft_id == draft.id,
            DraftPick.member_id == uuid.UUID(member_id),
        )
    )
    member_player_ids = [row[0] for row in member_picks.all()]

    # Get positions of players already picked by this member
    if member_player_ids:
        member_players = await db.execute(
            select(Player.position).where(Player.id.in_(member_player_ids))
        )
        picked_positions = [row[0] for row in member_players.all()]
    else:
        picked_positions = []

    # Get league roster slots to determine needs
    league = await db.get(League, league_id)
    roster_slots = league.roster_slots if league else {}

    # Calculate positional needs (simplified)
    position_counts = {}
    for pos in picked_positions:
        position_counts[pos] = position_counts.get(pos, 0) + 1

    # Priority order for auto-pick: positions with most remaining need
    needed_positions = []
    for pos, required in roster_slots.items():
        if pos == "BN" or pos == "FLEX":
            continue
        current = position_counts.get(pos, 0)
        if current < required:
            needed_positions.append(pos)

    # If all starting slots filled, pick best available regardless
    if not needed_positions:
        needed_positions = ["RB", "WR", "QB", "TE", "K", "DEF"]

    # Find best available player (by alphabetical name as fallback since we may not have projections)
    for pos in needed_positions:
        result = await db.execute(
            select(Player)
            .where(
                Player.position == pos,
                Player.id.notin_(drafted_ids),
                Player.team.isnot(None),  # active players only
            )
            .order_by(Player.full_name)
            .limit(1)
        )
        player = result.scalar_one_or_none()
        if player:
            # Create a fake user to make the pick
            member = await db.get(LeagueMember, uuid.UUID(member_id))
            if member:
                user = await db.get(User, member.user_id)
                if user:
                    return await make_pick(db, user, league_id, player.id)

    return None


def _get_picking_member_id(draft: Draft) -> str:
    """Given the draft state, return the member_id who should pick next (snake order)."""
    if not draft.draft_order:
        raise HTTPException(status_code=400, detail="Draft order not set")

    num_teams = len(draft.draft_order)
    pick_index = draft.current_pick - 1  # 0-based
    current_round = pick_index // num_teams  # 0-based round

    if draft.type == "snake":
        # Even rounds: normal order, odd rounds: reversed
        if current_round % 2 == 0:
            position_in_round = pick_index % num_teams
        else:
            position_in_round = num_teams - 1 - (pick_index % num_teams)
    else:
        # Linear: same order every round
        position_in_round = pick_index % num_teams

    return draft.draft_order[position_in_round]


async def get_draft_board(db: AsyncSession, league_id: uuid.UUID) -> dict:
    """Get the full draft board with picks, members, and draft state."""
    draft = await get_draft(db, league_id)

    # Get all picks with player names
    picks_result = await db.execute(
        select(DraftPick, Player.full_name, LeagueMember.team_name)
        .outerjoin(Player, Player.id == DraftPick.player_id)
        .outerjoin(LeagueMember, LeagueMember.id == DraftPick.member_id)
        .where(DraftPick.draft_id == draft.id)
        .order_by(DraftPick.pick_number)
    )

    picks = []
    for pick, player_name, team_name in picks_result.all():
        picks.append({
            "id": pick.id,
            "draft_id": pick.draft_id,
            "member_id": pick.member_id,
            "player_id": pick.player_id,
            "round": pick.round,
            "pick_number": pick.pick_number,
            "amount": pick.amount,
            "picked_at": pick.picked_at,
            "player_name": player_name,
            "member_team_name": team_name,
        })

    # Get members
    members_result = await db.execute(
        select(LeagueMember, User.username)
        .join(User, User.id == LeagueMember.user_id)
        .where(LeagueMember.league_id == league_id)
    )
    members = []
    for member, username in members_result.all():
        members.append({
            "id": str(member.id),
            "team_name": member.team_name,
            "username": username,
        })

    # Build draft response
    num_teams = len(draft.draft_order) if draft.draft_order else 0
    on_the_clock = None
    if draft.status == "in_progress" and draft.draft_order:
        on_the_clock = _get_picking_member_id(draft)

    draft_data = {
        "id": draft.id,
        "league_id": draft.league_id,
        "type": draft.type,
        "status": draft.status,
        "pick_time_limit": draft.pick_time_limit,
        "rounds": draft.rounds,
        "draft_order": draft.draft_order,
        "current_pick": draft.current_pick,
        "started_at": draft.started_at,
        "completed_at": draft.completed_at,
        "total_picks": num_teams * draft.rounds if num_teams else 0,
        "on_the_clock": on_the_clock,
    }

    return {"draft": draft_data, "picks": picks, "members": members}


async def get_available_players(
    db: AsyncSession, league_id: uuid.UUID,
    position: str | None = None, search: str | None = None,
    limit: int = 50,
) -> list[Player]:
    """Get players not yet drafted in this league's draft."""
    draft = await get_draft(db, league_id)

    drafted_result = await db.execute(
        select(DraftPick.player_id).where(DraftPick.draft_id == draft.id)
    )
    drafted_ids = {row[0] for row in drafted_result.all()}

    query = select(Player).where(
        Player.id.notin_(drafted_ids) if drafted_ids else True,
        Player.position.in_({"QB", "RB", "WR", "TE", "K", "DEF"}),
    )

    if position:
        query = query.where(Player.position == position.upper())
    if search:
        query = query.where(Player.full_name.ilike(f"%{search}%"))

    query = query.order_by(Player.full_name).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def _get_league_members(db: AsyncSession, league_id: uuid.UUID) -> list[LeagueMember]:
    result = await db.execute(
        select(LeagueMember).where(LeagueMember.league_id == league_id)
    )
    return list(result.scalars().all())


async def _get_member_for_user(db: AsyncSession, league_id: uuid.UUID, user_id: uuid.UUID) -> LeagueMember | None:
    result = await db.execute(
        select(LeagueMember).where(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _generate_rosters(db: AsyncSession, draft: Draft) -> None:
    """After draft completes, create rosters from draft picks."""
    logger.info(f"Generating rosters for league {draft.league_id}")

    league = await db.get(League, draft.league_id)
    if not league:
        return

    members = await _get_league_members(db, draft.league_id)
    roster_slots = league.roster_slots

    for member in members:
        # Create roster
        roster = Roster(league_id=draft.league_id, member_id=member.id)
        db.add(roster)
        await db.flush()

        # Get this member's draft picks in order
        picks_result = await db.execute(
            select(DraftPick, Player.position)
            .join(Player, Player.id == DraftPick.player_id)
            .where(
                DraftPick.draft_id == draft.id,
                DraftPick.member_id == member.id,
            )
            .order_by(DraftPick.pick_number)
        )

        # Assign players to slots
        slot_tracker: dict[str, int] = {}  # position -> count filled
        bench_count = 0

        for pick, position in picks_result.all():
            # Try to place in a starting slot
            slot_name = _assign_slot(position, roster_slots, slot_tracker)
            if not slot_name:
                # Try FLEX
                if position in ("RB", "WR", "TE") and slot_tracker.get("FLEX", 0) < roster_slots.get("FLEX", 0):
                    slot_name = f"FLEX"
                    slot_tracker["FLEX"] = slot_tracker.get("FLEX", 0) + 1
                else:
                    # Bench
                    bench_count += 1
                    slot_name = f"BN{bench_count}"

            db.add(RosterPlayer(
                roster_id=roster.id,
                player_id=pick.player_id,
                slot=slot_name,
                acquired_via="draft",
            ))

    await db.commit()
    logger.info(f"Rosters generated for {len(members)} members")


def _assign_slot(position: str, roster_slots: dict, tracker: dict) -> str | None:
    """Try to assign a player to their natural position slot."""
    max_for_pos = roster_slots.get(position, 0)
    current = tracker.get(position, 0)
    if current < max_for_pos:
        tracker[position] = current + 1
        if max_for_pos == 1:
            return position
        return f"{position}{current + 1}"
    return None
