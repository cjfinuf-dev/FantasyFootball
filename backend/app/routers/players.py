from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.player import (
    PlayerResponse, PlayerDetailResponse, PlayerStatsResponse,
    PlayerProjectionResponse, TrendingPlayerResponse, SyncStatusResponse,
)
from app.services import player_service

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("", response_model=list[PlayerResponse])
async def search_players(
    search: str | None = None,
    position: str | None = None,
    team: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    players = await player_service.search_players(db, search, position, team, limit, offset)
    return [PlayerResponse.model_validate(p, from_attributes=True) for p in players]


@router.get("/trending", response_model=list[TrendingPlayerResponse])
async def get_trending(
    trend_type: str = Query(default="add", regex="^(add|drop)$"),
    limit: int = Query(default=25, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await player_service.get_trending(db, trend_type, limit)


@router.get("/count")
async def get_player_count(db: AsyncSession = Depends(get_db)):
    count = await player_service.get_player_count(db)
    return {"count": count}


@router.post("/sync", response_model=SyncStatusResponse)
async def sync_players(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a full player sync from Sleeper. (Dev/admin use.)"""
    count = await player_service.sync_all_players(db)
    return SyncStatusResponse(players_synced=count, message=f"Synced {count} players from Sleeper")


@router.post("/sync-stats", response_model=dict)
async def sync_stats(
    season: int = Query(...),
    week: int = Query(..., ge=1, le=18),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger stats + projections sync for a specific week."""
    stats_count = await player_service.sync_weekly_stats(db, season, week)
    proj_count = await player_service.sync_weekly_projections(db, season, week)
    return {
        "stats_synced": stats_count,
        "projections_synced": proj_count,
        "message": f"Synced {season} week {week}",
    }


@router.get("/{player_id}", response_model=PlayerDetailResponse)
async def get_player(player_id: str, db: AsyncSession = Depends(get_db)):
    player = await player_service.get_player_by_id(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerDetailResponse.model_validate(player, from_attributes=True)


@router.get("/{player_id}/stats", response_model=list[PlayerStatsResponse])
async def get_player_stats(
    player_id: str,
    season: int | None = None,
    week: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    stats = await player_service.get_player_stats(db, player_id, season, week)
    return [PlayerStatsResponse.model_validate(s, from_attributes=True) for s in stats]


@router.get("/{player_id}/projections", response_model=list[PlayerProjectionResponse])
async def get_player_projections(
    player_id: str,
    season: int | None = None,
    week: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    projs = await player_service.get_player_projections(db, player_id, season, week)
    return [PlayerProjectionResponse.model_validate(p, from_attributes=True) for p in projs]
