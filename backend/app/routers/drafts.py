"""Draft endpoints: settings, order, start, pick, board, available players."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.draft import (
    DraftBoardResponse,
    DraftOrderRequest,
    DraftPickRequest,
    DraftPickResponse,
    DraftResponse,
    DraftSettingsRequest,
)
from app.services import draft_service

router = APIRouter(prefix="/api/leagues/{league_id}/draft", tags=["drafts"])


@router.get("", response_model=DraftResponse)
async def get_draft(
    league_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    draft = await draft_service.get_or_create_draft(db, league_id)
    num_teams = len(draft.draft_order) if draft.draft_order else 0
    return DraftResponse(
        id=draft.id,
        league_id=draft.league_id,
        type=draft.type,
        status=draft.status,
        pick_time_limit=draft.pick_time_limit,
        rounds=draft.rounds,
        draft_order=draft.draft_order,
        current_pick=draft.current_pick,
        started_at=draft.started_at,
        completed_at=draft.completed_at,
        total_picks=num_teams * draft.rounds if num_teams else 0,
        on_the_clock=draft_service._get_picking_member_id(draft) if draft.status == "in_progress" and draft.draft_order else None,
    )


@router.put("/settings", response_model=DraftResponse)
async def update_draft_settings(
    league_id: uuid.UUID,
    body: DraftSettingsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    draft = await draft_service.set_draft_settings(
        db, user, league_id, body.type, body.pick_time_limit, body.rounds,
    )
    return draft


@router.put("/order", response_model=DraftResponse)
async def set_draft_order(
    league_id: uuid.UUID,
    body: DraftOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    draft = await draft_service.set_draft_order(
        db, user, league_id, order=body.order if not body.randomize else None, randomize=body.randomize,
    )
    return draft


@router.post("/start", response_model=DraftResponse)
async def start_draft(
    league_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    draft = await draft_service.start_draft(db, user, league_id)
    return draft


@router.post("/pick", response_model=DraftPickResponse)
async def make_pick(
    league_id: uuid.UUID,
    body: DraftPickRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pick = await draft_service.make_pick(db, user, league_id, body.player_id)
    return pick


@router.get("/board", response_model=DraftBoardResponse)
async def get_draft_board(
    league_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await draft_service.get_draft_board(db, league_id)


@router.get("/available")
async def get_available_players(
    league_id: uuid.UUID,
    position: str | None = None,
    search: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    players = await draft_service.get_available_players(db, league_id, position, search, limit)
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "position": p.position,
            "team": p.team,
            "status": p.status,
        }
        for p in players
    ]
