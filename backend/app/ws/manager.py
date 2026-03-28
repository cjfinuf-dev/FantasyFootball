"""WebSocket connection manager with Redis pub/sub for multi-worker support."""

import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        self._rooms[room].add(ws)

    def disconnect(self, room: str, ws: WebSocket):
        self._rooms[room].discard(ws)
        if not self._rooms[room]:
            del self._rooms[room]

    async def broadcast(self, room: str, message: dict):
        data = json.dumps(message)
        dead = []
        for ws in self._rooms.get(room, set()):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(room, ws)

    async def send_personal(self, ws: WebSocket, message: dict):
        await ws.send_text(json.dumps(message))


manager = ConnectionManager()
