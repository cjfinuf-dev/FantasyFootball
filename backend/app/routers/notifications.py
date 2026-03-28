"""Notification endpoints: list, count, mark read, delete."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationCountResponse, NotificationResponse
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notification_service.get_notifications(db, user.id, unread_only, min(limit, 100))


@router.get("/count", response_model=NotificationCountResponse)
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await notification_service.get_unread_count(db, user.id)
    return NotificationCountResponse(unread=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notification_service.mark_read(db, user.id, notification_id)


@router.post("/read-all")
async def read_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await notification_service.mark_all_read(db, user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await notification_service.delete_notification(db, user.id, notification_id)
    return {"status": "deleted"}
