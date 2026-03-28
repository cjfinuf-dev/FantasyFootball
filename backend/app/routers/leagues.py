import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.league import (
    LeagueCreate, LeagueUpdate, LeagueResponse,
    LeagueMemberResponse, JoinByCodeRequest, SetTeamNameRequest,
)
from app.services import league_service

router = APIRouter(prefix="/api/leagues", tags=["leagues"])


@router.post("", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    body: LeagueCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    league = await league_service.create_league(db, user, body)
    return LeagueResponse.model_validate(league, from_attributes=True)


@router.get("", response_model=list[LeagueResponse])
async def list_my_leagues(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    leagues = await league_service.get_user_leagues(db, user)
    return [LeagueResponse.model_validate(l, from_attributes=True) for l in leagues]


@router.get("/{league_id}", response_model=LeagueResponse)
async def get_league(
    league_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    league = await league_service.get_league_by_id(db, league_id)
    return LeagueResponse.model_validate(league, from_attributes=True)


@router.patch("/{league_id}", response_model=LeagueResponse)
async def update_league(
    league_id: uuid.UUID,
    body: LeagueUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    league = await league_service.update_league(db, user, league_id, body)
    return LeagueResponse.model_validate(league, from_attributes=True)


@router.delete("/{league_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_league(
    league_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await league_service.delete_league(db, user, league_id)


@router.post("/{league_id}/join", response_model=LeagueMemberResponse)
async def join_league(
    league_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await league_service.join_league_by_id(db, user, league_id)
    return LeagueMemberResponse.model_validate(member, from_attributes=True)


@router.post("/join-by-code", response_model=LeagueMemberResponse)
async def join_by_code(
    body: JoinByCodeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await league_service.join_league_by_code(db, user, body.invite_code)
    return LeagueMemberResponse.model_validate(member, from_attributes=True)


@router.post("/{league_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_league(
    league_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await league_service.leave_league(db, user, league_id)


@router.get("/{league_id}/members", response_model=list[LeagueMemberResponse])
async def get_members(
    league_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await league_service.get_league_members(db, league_id)


@router.patch("/{league_id}/team-name", response_model=LeagueMemberResponse)
async def set_team_name(
    league_id: uuid.UUID,
    body: SetTeamNameRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await league_service.set_team_name(db, user, league_id, body.team_name)
    return LeagueMemberResponse.model_validate(member, from_attributes=True)


@router.get("/{league_id}/standings")
async def get_standings(
    league_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await league_service.get_standings(db, league_id)
