"""Matchup endpoints: schedule, weekly matchups, scoring, detail."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services import matchup_service

router = APIRouter(prefix="/api/leagues/{league_id}/matchups", tags=["matchups"])


@router.get("")
async def get_matchups(
    league_id: uuid.UUID,
    week: int = 1,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await matchup_service.get_matchups_for_week(db, user, league_id, week)


@router.get("/{matchup_id}")
async def get_matchup_detail(
    league_id: uuid.UUID,
    matchup_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await matchup_service.get_matchup_detail(db, user, league_id, matchup_id)


@router.post("/generate")
async def generate_schedule(
    league_id: uuid.UUID,
    weeks: int = 14,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    matchups = await matchup_service.generate_schedule(db, league_id, weeks)
    return {"message": f"Generated {len(matchups)} matchups across {weeks} weeks"}


@router.post("/score")
async def score_week(
    league_id: uuid.UUID,
    week: int = 1,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    matchups = await matchup_service.calculate_matchup_scores(db, league_id, week)
    return {"message": f"Scored {len(matchups)} matchups for week {week}"}


@router.post("/finalize")
async def finalize_week(
    league_id: uuid.UUID,
    week: int = 1,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await matchup_service.finalize_week(db, user, league_id, week)
