"""Live scoring WebSocket: pushes score updates during game time."""

import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import async_session
from app.utils.security import decode_token
from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws/scores/{league_id}")
async def scores_websocket(ws: WebSocket, league_id: str):
    room = f"scores:{league_id}"
    await manager.connect(room, ws)

    # Auth via first message
    authed = False
    try:
        # 10 second auth timeout
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

        authed = True
        await manager.send_personal(ws, {"type": "auth", "status": "ok"})

        while True:
            await ws.receive_text()  # keep-alive; server pushes scores

    except WebSocketDisconnect:
        manager.disconnect(room, ws)


async def broadcast_score_update(league_id: uuid.UUID, data: dict):
    """Called by sync_scores task to push updates to connected clients."""
    room = f"scores:{str(league_id)}"
    await manager.broadcast(room, {"type": "score_update", **data})
