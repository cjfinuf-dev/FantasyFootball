"""Roster endpoints: view, set lineup, add/drop players."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.roster import AddDropRequest, SetLineupRequest
from app.services import roster_service

router = APIRouter(prefix="/api/leagues/{league_id}/rosters", tags=["rosters"])


@router.get("")
async def get_rosters(
    league_id: uuid.UUID,
    week: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await roster_service.get_all_rosters(db, user, league_id, week)


@router.get("/me")
async def get_my_roster(
    league_id: uuid.UUID,
    week: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await roster_service.get_roster(db, user, league_id, week)


@router.put("/me/lineup")
async def set_lineup(
    league_id: uuid.UUID,
    body: SetLineupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await roster_service.set_lineup(db, user, league_id, body.lineup)


@router.post("/me/add")
async def add_player(
    league_id: uuid.UUID,
    body: AddDropRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await roster_service.add_player(db, user, league_id, body.player_id)


@router.post("/me/drop")
async def drop_player(
    league_id: uuid.UUID,
    body: AddDropRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await roster_service.drop_player(db, user, league_id, body.player_id)
