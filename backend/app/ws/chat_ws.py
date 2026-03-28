"""Real-time chat WebSocket: authenticated messaging with persistence."""

import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import async_session
from app.models.user import User
from app.services import chat_service
from app.utils.sanitize import sanitize_text
from app.utils.security import decode_token
from app.ws.manager import manager

router = APIRouter()

# Rate limit: track message timestamps per connection
_msg_timestamps: dict[int, list[float]] = {}
MAX_MESSAGES_PER_SECOND = 5


@router.websocket("/ws/chat/{league_id}")
async def chat_websocket(ws: WebSocket, league_id: str):
    room = f"chat:{league_id}"
    await manager.connect(room, ws)

    user_id: str | None = None
    ws_id = id(ws)
    _msg_timestamps[ws_id] = []

    try:
        # Auth timeout: 10 seconds
        try:
            data = await asyncio.wait_for(ws.receive_json(), timeout=10)
        except asyncio.TimeoutError:
            await ws.close(code=4001, reason="Auth timeout")
            manager.disconnect(room, ws)
            return

        token = data.get("token", "")
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            await ws.close(code=4003, reason="Invalid token")
            manager.disconnect(room, ws)
            return

        user_id = payload.get("sub")
        await manager.send_personal(ws, {"type": "auth", "status": "ok"})

        while True:
            data = await ws.receive_json()
            action = data.get("action")

            if not user_id:
                continue

            # Rate limit check
            import time
            now = time.time()
            timestamps = _msg_timestamps.get(ws_id, [])
            timestamps = [t for t in timestamps if now - t < 1.0]
            if len(timestamps) >= MAX_MESSAGES_PER_SECOND:
                await manager.send_personal(ws, {"type": "error", "detail": "Slow down! Too many messages."})
                continue
            timestamps.append(now)
            _msg_timestamps[ws_id] = timestamps

            if action == "message":
                content = data.get("content", "").strip()
                if not content or len(content) > 2000:
                    continue

                async with async_session() as db:
                    user = await db.get(User, uuid.UUID(user_id))
                    if not user:
                        continue

                    msg_data = await chat_service.send_message(
                        db, user, uuid.UUID(league_id), content,
                    )
                    # Convert UUIDs and datetimes for JSON
                    broadcast_data = {
                        "type": "message",
                        "id": str(msg_data["id"]),
                        "user_id": str(msg_data["user_id"]),
                        "username": msg_data["username"],
                        "avatar_url": msg_data["avatar_url"],
                        "content": msg_data["content"],
                        "message_type": msg_data["message_type"],
                        "created_at": msg_data["created_at"].isoformat(),
                        "reactions": {},
                    }
                    await manager.broadcast(room, broadcast_data)

            elif action == "react":
                message_id = data.get("message_id")
                emoji = data.get("emoji", "")
                if not message_id or not emoji:
                    continue

                async with async_session() as db:
                    user = await db.get(User, uuid.UUID(user_id))
                    if not user:
                        continue
                    result = await chat_service.add_reaction(
                        db, user, uuid.UUID(league_id), uuid.UUID(message_id), emoji,
                    )
                    await manager.broadcast(room, {
                        "type": "reaction",
                        "message_id": message_id,
                        "reactions": result["reactions"],
                    })

            elif action == "typing":
                # Broadcast typing indicator to others
                async with async_session() as db:
                    user = await db.get(User, uuid.UUID(user_id))
                    username = user.username if user else "Unknown"
                await manager.broadcast(room, {
                    "type": "typing",
                    "user_id": user_id,
                    "username": username,
                })

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(room, ws)
        _msg_timestamps.pop(ws_id, None)
