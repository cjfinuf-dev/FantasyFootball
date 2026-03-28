"""Chat endpoints: messages, reactions, polls."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.chat import MessageCreate, PollCreate, PollVote, ReactionRequest
from app.services import chat_service

router = APIRouter(prefix="/api/leagues/{league_id}/chat", tags=["chat"])


@router.get("/messages")
async def get_messages(
    league_id: uuid.UUID,
    before: uuid.UUID | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.get_messages(db, user, league_id, before, min(limit, 100))


@router.post("/messages")
async def send_message(
    league_id: uuid.UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.send_message(db, user, league_id, body.content, body.message_type, body.metadata)


@router.post("/messages/{message_id}/react")
async def react_to_message(
    league_id: uuid.UUID,
    message_id: uuid.UUID,
    body: ReactionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.add_reaction(db, user, league_id, message_id, body.emoji)


@router.post("/polls")
async def create_poll(
    league_id: uuid.UUID,
    body: PollCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.create_poll(db, user, league_id, body.question, body.options)


@router.post("/polls/{message_id}/vote")
async def vote_poll(
    league_id: uuid.UUID,
    message_id: uuid.UUID,
    body: PollVote,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.vote_poll(db, user, league_id, message_id, body.option_index)
