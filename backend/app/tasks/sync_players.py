"""Nightly job: pull full player DB from Sleeper API, upsert into players table.

Can be triggered via:
  - POST /api/players/sync (admin endpoint)
  - Scheduled task (cron or APScheduler in lifespan)
"""

import logging

from app.database import async_session
from app.services.player_service import sync_all_players

logger = logging.getLogger(__name__)


async def run_player_sync() -> int:
    """Standalone sync function for use in scheduled tasks."""
    async with async_session() as db:
        count = await sync_all_players(db)
        logger.info(f"Player sync complete: {count} players")
        return count
