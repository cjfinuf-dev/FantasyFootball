"""Transaction endpoints: trades, waivers, history."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.league import LeagueMember
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TradeProposal,
    TransactionAction,
    TransactionResponse,
    WaiverClaim,
)
from app.services import trade_service, waiver_service
from app.services.roster_service import require_league_member

router = APIRouter(prefix="/api/leagues/{league_id}/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    league_id: uuid.UUID,
    type: str | None = None,
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_league_member(db, league_id, user.id)

    query = select(Transaction).where(Transaction.league_id == league_id)
    if type:
        query = query.where(Transaction.type == type)
    if status:
        query = query.where(Transaction.status == status)
    query = query.order_by(Transaction.proposed_at.desc())

    result = await db.execute(query)
    txns = result.scalars().all()

    # Enrich with proposer names
    responses = []
    for txn in txns:
        member = await db.get(LeagueMember, txn.proposed_by)
        responses.append(TransactionResponse(
            id=txn.id,
            league_id=txn.league_id,
            type=txn.type,
            status=txn.status,
            proposed_by=txn.proposed_by,
            proposed_by_name=member.team_name if member else None,
            proposed_at=txn.proposed_at,
            resolved_at=txn.resolved_at,
            details=txn.details,
        ))
    return responses


@router.post("/trade", response_model=TransactionResponse)
async def propose_trade(
    league_id: uuid.UUID,
    body: TradeProposal,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await trade_service.propose_trade(
        db, user, league_id, body.to_member_id, body.send_player_ids, body.receive_player_ids,
    )
    return txn


@router.post("/waiver", response_model=TransactionResponse)
async def claim_waiver(
    league_id: uuid.UUID,
    body: WaiverClaim,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await waiver_service.submit_waiver_claim(
        db, user, league_id, body.player_id, body.drop_player_id, body.bid_amount,
    )
    return txn


@router.patch("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    league_id: uuid.UUID,
    txn_id: uuid.UUID,
    body: TransactionAction,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept, reject, cancel, or veto a transaction."""
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.league_id != league_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.type == "trade":
        txn = await trade_service.respond_to_trade(db, user, league_id, txn_id, body.action)
    elif txn.type == "waiver" and body.action == "cancel":
        txn = await waiver_service.cancel_waiver_claim(db, user, league_id, txn_id)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Action '{body.action}' not valid for {txn.type}")

    return txn


@router.post("/waivers/process")
async def process_waivers(
    league_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Commissioner-triggered waiver processing."""
    from app.models.league import League
    league = await db.get(League, league_id)
    if not league or league.commissioner_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only the commissioner can process waivers")

    processed = await waiver_service.process_waivers(db, league_id)
    completed = sum(1 for t in processed if t.status == "completed")
    return {"message": f"Processed {len(processed)} claims, {completed} successful"}
