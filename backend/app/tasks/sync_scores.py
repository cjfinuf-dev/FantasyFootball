"""Weekly stats & projections sync from Sleeper.

Can be triggered via:
  - POST /api/players/sync-stats (admin endpoint)
  - Scheduled task during game windows
"""

import logging

from app.database import async_session
from app.services.player_service import sync_weekly_stats, sync_weekly_projections

logger = logging.getLogger(__name__)


async def run_stats_sync(season: int, week: int) -> dict:
    """Sync both stats and projections for a given week."""
    async with async_session() as db:
        stats_count = await sync_weekly_stats(db, season, week)
        proj_count = await sync_weekly_projections(db, season, week)
        logger.info(f"Stats sync: {stats_count} stats, {proj_count} projections for {season} W{week}")
        return {"stats_synced": stats_count, "projections_synced": proj_count}
