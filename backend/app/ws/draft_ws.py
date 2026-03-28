"""Real-time draft WebSocket: pick processing, timer countdown, auto-pick on timeout."""

import asyncio
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import async_session
from app.models.user import User
from app.services import draft_service
from app.utils.security import decode_token
from app.ws.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

# Track active draft timers so we can cancel on new pick
_draft_timers: dict[str, asyncio.Task] = {}


@router.websocket("/ws/draft/{league_id}")
async def draft_websocket(ws: WebSocket, league_id: str):
    room = f"draft:{league_id}"
    await manager.connect(room, ws)

    # Authenticate via first message
    user_id: str | None = None
    try:
        while True:
            data = await ws.receive_json()
            action = data.get("action")

            if action == "auth":
                token = data.get("token", "")
                payload = decode_token(token)
                if payload:
                    user_id = payload.get("sub")
                    await manager.send_personal(ws, {"type": "auth", "status": "ok"})
                else:
                    await manager.send_personal(ws, {"type": "auth", "status": "error", "detail": "Invalid token"})
                continue

            if not user_id:
                await manager.send_personal(ws, {"type": "error", "detail": "Not authenticated. Send auth first."})
                continue

            if action == "pick":
                await _handle_pick(ws, room, league_id, user_id, data.get("player_id", ""))

            elif action == "join":
                # Client joined the draft room — send current board
                async with async_session() as db:
                    board = await draft_service.get_draft_board(db, uuid.UUID(league_id))
                await manager.send_personal(ws, {"type": "board", **board})
                # Start timer if draft is in progress
                _ensure_timer(league_id, room)

    except WebSocketDisconnect:
        manager.disconnect(room, ws)


async def _handle_pick(ws: WebSocket, room: str, league_id: str, user_id: str, player_id: str):
    """Process a pick via WebSocket and broadcast to all clients."""
    try:
        async with async_session() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if not user:
                await manager.send_personal(ws, {"type": "error", "detail": "User not found"})
                return

            pick = await draft_service.make_pick(db, user, uuid.UUID(league_id), player_id)

            # Get updated board state
            board = await draft_service.get_draft_board(db, uuid.UUID(league_id))

        # Broadcast pick + updated state to all clients
        await manager.broadcast(room, {
            "type": "pick_made",
            "pick": {
                "pick_number": pick.pick_number,
                "member_id": str(pick.member_id),
                "player_id": pick.player_id,
                "round": pick.round,
                "picked_at": pick.picked_at.isoformat() if pick.picked_at else None,
            },
            "draft": board["draft"],
        })

        # Reset timer for next pick
        _cancel_timer(league_id)
        if board["draft"]["status"] == "in_progress":
            _ensure_timer(league_id, room)

    except Exception as e:
        await manager.send_personal(ws, {"type": "error", "detail": str(e)})


def _ensure_timer(league_id: str, room: str):
    """Start a pick timer if one isn't already running."""
    if league_id not in _draft_timers or _draft_timers[league_id].done():
        _draft_timers[league_id] = asyncio.create_task(_run_timer(league_id, room))


def _cancel_timer(league_id: str):
    task = _draft_timers.pop(league_id, None)
    if task and not task.done():
        task.cancel()


async def _run_timer(league_id: str, room: str):
    """Countdown timer that broadcasts remaining time and auto-picks on expiry."""
    try:
        async with async_session() as db:
            draft = await draft_service.get_draft(db, uuid.UUID(league_id))
            time_limit = draft.pick_time_limit

        remaining = time_limit
        while remaining > 0:
            await manager.broadcast(room, {"type": "timer", "remaining": remaining})
            await asyncio.sleep(1)
            remaining -= 1

        # Time expired — auto-pick
        await manager.broadcast(room, {"type": "timer", "remaining": 0})

        async with async_session() as db:
            pick = await draft_service.auto_pick(db, uuid.UUID(league_id))
            if pick:
                board = await draft_service.get_draft_board(db, uuid.UUID(league_id))
                await manager.broadcast(room, {
                    "type": "auto_pick",
                    "pick": {
                        "pick_number": pick.pick_number,
                        "member_id": str(pick.member_id),
                        "player_id": pick.player_id,
                        "round": pick.round,
                        "picked_at": pick.picked_at.isoformat() if pick.picked_at else None,
                    },
                    "draft": board["draft"],
                })

                # Start next timer if draft still going
                if board["draft"]["status"] == "in_progress":
                    _draft_timers[league_id] = asyncio.create_task(_run_timer(league_id, room))

    except asyncio.CancelledError:
        pass
    except Exception:
        logger.exception(f"Timer error for draft {league_id}")
