"""Trade logic: propose, accept, reject, veto, execute roster swaps."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeagueMember
from app.models.player import Player
from app.models.roster import Roster, RosterPlayer
from app.models.transaction import Transaction
from app.models.user import User
from app.services.roster_service import require_league_member


async def propose_trade(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    to_member_id: uuid.UUID, send_ids: list[str], receive_ids: list[str],
) -> Transaction:
    """Create a trade proposal between two league members."""
    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Enforce trade deadline
    if league.trade_deadline and datetime.now(timezone.utc).date() > league.trade_deadline:
        raise HTTPException(status_code=400, detail="Trade deadline has passed")

    proposer = await require_league_member(db, league_id, user.id)

    # Validate target member exists
    target = await db.get(LeagueMember, to_member_id)
    if not target or target.league_id != league_id:
        raise HTTPException(status_code=404, detail="Target member not found in this league")

    if proposer.id == to_member_id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")

    # Validate proposer owns send players
    await _validate_ownership(db, league_id, proposer.id, send_ids)
    # Validate target owns receive players
    await _validate_ownership(db, league_id, to_member_id, receive_ids)

    txn = Transaction(
        league_id=league_id,
        type="trade",
        status="pending",
        proposed_by=proposer.id,
        details={
            "to_member_id": str(to_member_id),
            "send_player_ids": send_ids,
            "receive_player_ids": receive_ids,
        },
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    # Notify the trade target
    from app.services.notification_service import create_notification, TRADE_PROPOSED
    target_member = await db.get(LeagueMember, to_member_id)
    if target_member:
        await create_notification(
            db, target_member.user_id, TRADE_PROPOSED,
            "New Trade Proposal",
            f"You have a new trade offer in {league.name}",
            {"league_id": str(league_id), "transaction_id": str(txn.id)},
        )
        await db.commit()

    return txn


async def respond_to_trade(
    db: AsyncSession, user: User, league_id: uuid.UUID, txn_id: uuid.UUID, action: str,
) -> Transaction:
    """Accept, reject, cancel, or veto a trade."""
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.league_id != league_id or txn.type != "trade":
        raise HTTPException(status_code=404, detail="Trade not found")
    if txn.status != "pending":
        raise HTTPException(status_code=400, detail="Trade is no longer pending")

    member = await require_league_member(db, league_id, user.id)
    league = await db.get(League, league_id)

    to_member_id = uuid.UUID(txn.details["to_member_id"])

    if action == "accept":
        if member.id != to_member_id:
            raise HTTPException(status_code=403, detail="Only the trade target can accept")
        # Execute the swap
        await _execute_trade(db, league_id, txn)
        txn.status = "completed"

    elif action == "reject":
        if member.id != to_member_id:
            raise HTTPException(status_code=403, detail="Only the trade target can reject")
        txn.status = "rejected"

    elif action == "cancel":
        if member.id != txn.proposed_by:
            raise HTTPException(status_code=403, detail="Only the proposer can cancel")
        txn.status = "cancelled"

    elif action == "veto":
        if not league or league.commissioner_id != user.id:
            raise HTTPException(status_code=403, detail="Only the commissioner can veto")
        txn.status = "vetoed"

    txn.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(txn)

    # Notify proposer of the outcome
    if action in ("accept", "reject", "veto"):
        from app.services.notification_service import create_notification, TRADE_ACCEPTED, TRADE_REJECTED, TRADE_VETOED
        type_map = {"accept": TRADE_ACCEPTED, "reject": TRADE_REJECTED, "veto": TRADE_VETOED}
        proposer_member = await db.get(LeagueMember, txn.proposed_by)
        if proposer_member:
            league_name = league.name if league else "league"
            await create_notification(
                db, proposer_member.user_id, type_map[action],
                f"Trade {action.title()}ed",
                f"Your trade in {league_name} was {action}ed",
                {"league_id": str(league_id), "transaction_id": str(txn.id)},
            )
            await db.commit()

    return txn


async def _execute_trade(db: AsyncSession, league_id: uuid.UUID, txn: Transaction) -> None:
    """Swap players between two rosters."""
    send_ids = txn.details["send_player_ids"]
    receive_ids = txn.details["receive_player_ids"]
    to_member_id = uuid.UUID(txn.details["to_member_id"])
    from_member_id = txn.proposed_by

    proposer_roster = await _get_roster(db, league_id, from_member_id)
    target_roster = await _get_roster(db, league_id, to_member_id)

    if not proposer_roster or not target_roster:
        raise HTTPException(status_code=400, detail="Roster not found for trade execution")

    # Move send players: proposer → target
    for pid in send_ids:
        rp = await _get_roster_player(db, proposer_roster.id, pid)
        if not rp:
            raise HTTPException(status_code=400, detail=f"Player {pid} no longer on proposer's roster")
        rp.roster_id = target_roster.id
        rp.slot = f"BN{await _next_bench_num(db, target_roster.id)}"
        rp.acquired_via = "trade"

    # Move receive players: target → proposer
    for pid in receive_ids:
        rp = await _get_roster_player(db, target_roster.id, pid)
        if not rp:
            raise HTTPException(status_code=400, detail=f"Player {pid} no longer on target's roster")
        rp.roster_id = proposer_roster.id
        rp.slot = f"BN{await _next_bench_num(db, proposer_roster.id)}"
        rp.acquired_via = "trade"


async def _validate_ownership(db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID, player_ids: list[str]) -> None:
    roster = await _get_roster(db, league_id, member_id)
    if not roster:
        raise HTTPException(status_code=400, detail="Roster not found")

    for pid in player_ids:
        rp = await _get_roster_player(db, roster.id, pid)
        if not rp:
            raise HTTPException(status_code=400, detail=f"Member does not own player {pid}")


async def _get_roster(db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID) -> Roster | None:
    result = await db.execute(
        select(Roster).where(Roster.league_id == league_id, Roster.member_id == member_id)
    )
    return result.scalar_one_or_none()


async def _get_roster_player(db: AsyncSession, roster_id: uuid.UUID, player_id: str) -> RosterPlayer | None:
    result = await db.execute(
        select(RosterPlayer).where(RosterPlayer.roster_id == roster_id, RosterPlayer.player_id == player_id)
    )
    return result.scalar_one_or_none()


async def _next_bench_num(db: AsyncSession, roster_id: uuid.UUID) -> int:
    result = await db.execute(
        select(RosterPlayer).where(RosterPlayer.roster_id == roster_id)
    )
    bench_slots = [rp.slot for rp in result.scalars().all() if rp.slot.startswith("BN")]
    return len(bench_slots) + 1
