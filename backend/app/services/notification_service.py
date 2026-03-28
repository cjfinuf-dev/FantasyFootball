"""Notification creation, delivery, and management."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

# ─── Notification types ───────────────────────────────────────────────
TRADE_PROPOSED = "trade_proposed"
TRADE_ACCEPTED = "trade_accepted"
TRADE_REJECTED = "trade_rejected"
TRADE_VETOED = "trade_vetoed"
WAIVER_WON = "waiver_won"
WAIVER_LOST = "waiver_lost"
DRAFT_STARTING = "draft_starting"
DRAFT_YOUR_PICK = "draft_your_pick"
DRAFT_COMPLETE = "draft_complete"
MATCHUP_FINAL = "matchup_final"
CHAT_MENTION = "chat_mention"
LEAGUE_JOINED = "league_joined"


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str | None = None,
    data: dict | None = None,
) -> Notification:
    """Create a notification and attempt push delivery."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data,
    )
    db.add(notif)
    await db.flush()

    # Attempt push notification
    user = await db.get(User, user_id)
    if user and user.push_token:
        await _send_push(user.push_token, title, body, data)

    return notif


async def notify_many(
    db: AsyncSession,
    user_ids: list[uuid.UUID],
    type: str,
    title: str,
    body: str | None = None,
    data: dict | None = None,
) -> list[Notification]:
    """Send the same notification to multiple users."""
    notifs = []
    for uid in user_ids:
        n = await create_notification(db, uid, type, title, body, data)
        notifs.append(n)
    await db.commit()
    return notifs


async def get_notifications(
    db: AsyncSession, user_id: uuid.UUID, unread_only: bool = False, limit: int = 50,
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    return result.scalar_one()


async def mark_read(db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification:
    notif = await db.get(Notification, notification_id)
    if not notif or notif.user_id != user_id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount


async def delete_notification(db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
    notif = await db.get(Notification, notification_id)
    if not notif or notif.user_id != user_id:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(notif)
    await db.commit()


# ─── Push delivery via Expo ──────────────────────────────────────────

async def _send_push(push_token: str, title: str, body: str | None, data: dict | None) -> None:
    """Send a push notification via Expo's push service."""
    try:
        import httpx

        message = {
            "to": push_token,
            "title": title,
            "sound": "default",
        }
        if body:
            message["body"] = body
        if data:
            message["data"] = data

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"},
                timeout=5.0,
            )
            if resp.status_code != 200:
                logger.warning(f"Push delivery failed: {resp.status_code} {resp.text}")
    except Exception:
        logger.warning("Push delivery error", exc_info=True)
