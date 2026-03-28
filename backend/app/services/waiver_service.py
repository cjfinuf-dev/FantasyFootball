"""Waiver logic: FAAB bidding, rolling priority, free agent pickup, processing."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.league import League, LeagueMember
from app.models.player import Player
from app.models.roster import Roster, RosterPlayer
from app.models.transaction import Transaction
from app.models.user import User
from app.services.roster_service import require_league_member


async def submit_waiver_claim(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    player_id: str, drop_player_id: str | None, bid_amount: int,
) -> Transaction:
    """Submit a waiver claim (FAAB bid or rolling priority)."""
    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    member = await require_league_member(db, league_id, user.id)

    # Validate target player exists and is a free agent
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check player isn't already rostered
    existing = await db.execute(
        select(RosterPlayer)
        .join(Roster, Roster.id == RosterPlayer.roster_id)
        .where(Roster.league_id == league_id, RosterPlayer.player_id == player_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Player is already on a roster")

    # FAAB validation
    if league.waiver_type == "faab":
        remaining_budget = await _get_remaining_budget(db, league, member.id)
        if bid_amount > remaining_budget:
            raise HTTPException(status_code=400, detail=f"Bid ${bid_amount} exceeds remaining budget ${remaining_budget}")

    # Validate drop player if provided
    if drop_player_id:
        roster = await _get_roster(db, league_id, member.id)
        if roster:
            drop_rp = await db.execute(
                select(RosterPlayer).where(
                    RosterPlayer.roster_id == roster.id, RosterPlayer.player_id == drop_player_id
                )
            )
            if not drop_rp.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Drop player is not on your roster")

    # Check for duplicate pending claim on same player
    dup = await db.execute(
        select(Transaction).where(
            Transaction.league_id == league_id,
            Transaction.type == "waiver",
            Transaction.status == "pending",
            Transaction.proposed_by == member.id,
        )
    )
    for existing_txn in dup.scalars().all():
        if existing_txn.details.get("player_id") == player_id:
            raise HTTPException(status_code=400, detail="You already have a pending claim on this player")

    txn = Transaction(
        league_id=league_id,
        type="waiver",
        status="pending",
        proposed_by=member.id,
        details={
            "player_id": player_id,
            "player_name": player.full_name,
            "drop_player_id": drop_player_id,
            "bid_amount": bid_amount,
        },
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


async def cancel_waiver_claim(
    db: AsyncSession, user: User, league_id: uuid.UUID, txn_id: uuid.UUID,
) -> Transaction:
    """Cancel a pending waiver claim."""
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.league_id != league_id or txn.type != "waiver":
        raise HTTPException(status_code=404, detail="Waiver claim not found")

    member = await require_league_member(db, league_id, user.id)
    if txn.proposed_by != member.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own claims")
    if txn.status != "pending":
        raise HTTPException(status_code=400, detail="Claim is no longer pending")

    txn.status = "cancelled"
    txn.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(txn)
    return txn


async def process_waivers(db: AsyncSession, league_id: uuid.UUID) -> list[Transaction]:
    """Process all pending waiver claims for a league. FAAB: highest bid wins. Rolling: priority order."""
    league = await db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Get all pending waiver claims
    result = await db.execute(
        select(Transaction).where(
            Transaction.league_id == league_id,
            Transaction.type == "waiver",
            Transaction.status == "pending",
        ).order_by(desc(Transaction.proposed_at))
    )
    pending = list(result.scalars().all())

    if not pending:
        return []

    # Group claims by target player
    claims_by_player: dict[str, list[Transaction]] = {}
    for txn in pending:
        pid = txn.details.get("player_id", "")
        claims_by_player.setdefault(pid, []).append(txn)

    processed = []

    for player_id, claims in claims_by_player.items():
        # Check player is still a free agent
        rostered = await db.execute(
            select(RosterPlayer)
            .join(Roster, Roster.id == RosterPlayer.roster_id)
            .where(Roster.league_id == league_id, RosterPlayer.player_id == player_id)
        )
        if rostered.scalar_one_or_none():
            # Player already picked up — reject all claims
            for c in claims:
                c.status = "rejected"
                c.resolved_at = datetime.now(timezone.utc)
                processed.append(c)
            continue

        # Sort: FAAB = highest bid first, rolling = earliest claim first
        if league.waiver_type == "faab":
            claims.sort(key=lambda c: c.details.get("bid_amount", 0), reverse=True)
        else:
            claims.sort(key=lambda c: c.proposed_at)

        winner = claims[0]
        losers = claims[1:]

        # Execute the winning claim
        success = await _execute_claim(db, league, winner)
        if success:
            winner.status = "completed"
        else:
            winner.status = "rejected"
        winner.resolved_at = datetime.now(timezone.utc)
        processed.append(winner)

        # Reject losers
        for c in losers:
            c.status = "rejected"
            c.resolved_at = datetime.now(timezone.utc)
            processed.append(c)

    await db.commit()
    return processed


async def _execute_claim(db: AsyncSession, league: League, txn: Transaction) -> bool:
    """Execute a single waiver claim: add player, optionally drop, deduct FAAB."""
    member_id = txn.proposed_by
    player_id = txn.details["player_id"]
    drop_player_id = txn.details.get("drop_player_id")
    bid = txn.details.get("bid_amount", 0)

    roster = await _get_roster(db, league.id, member_id)
    if not roster:
        return False

    # Drop player if specified
    if drop_player_id:
        drop_rp = await db.execute(
            select(RosterPlayer).where(
                RosterPlayer.roster_id == roster.id, RosterPlayer.player_id == drop_player_id
            )
        )
        rp_to_drop = drop_rp.scalar_one_or_none()
        if rp_to_drop:
            await db.delete(rp_to_drop)
        else:
            return False  # Can't drop — claim fails

    # Check roster space
    current = await db.execute(select(RosterPlayer).where(RosterPlayer.roster_id == roster.id))
    current_players = list(current.scalars().all())
    total_slots = sum(league.roster_slots.values())
    if len(current_players) >= total_slots:
        return False

    # Add player
    bench_count = sum(1 for rp in current_players if rp.slot.startswith("BN"))
    db.add(RosterPlayer(
        roster_id=roster.id,
        player_id=player_id,
        slot=f"BN{bench_count + 1}",
        acquired_via="waivers",
    ))

    # Record FAAB spend in transaction details
    if league.waiver_type == "faab" and bid > 0:
        txn.details["faab_spent"] = bid

    return True


async def _get_remaining_budget(db: AsyncSession, league: League, member_id: uuid.UUID) -> int:
    """Calculate remaining FAAB budget for a member."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.league_id == league.id,
            Transaction.type == "waiver",
            Transaction.status == "completed",
            Transaction.proposed_by == member_id,
        )
    )
    spent = sum(t.details.get("faab_spent", 0) for t in result.scalars().all())
    return league.faab_budget - spent


async def _get_roster(db: AsyncSession, league_id: uuid.UUID, member_id: uuid.UUID) -> Roster | None:
    result = await db.execute(
        select(Roster).where(Roster.league_id == league_id, Roster.member_id == member_id)
    )
    return result.scalar_one_or_none()
