"""Player search, detail, stats, projections, and Sleeper sync orchestration."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.player import Player, PlayerStats, PlayerProjection
from app.utils import sleeper_client
from app.utils.scoring import calculate_points

logger = logging.getLogger(__name__)

FANTASY_POSITIONS = {"QB", "RB", "WR", "TE", "K", "DEF"}


async def search_players(
    db: AsyncSession,
    search: str | None = None,
    position: str | None = None,
    team: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Player]:
    query = select(Player).where(Player.position.in_(FANTASY_POSITIONS))

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Player.full_name.ilike(pattern),
                Player.last_name.ilike(pattern),
                Player.first_name.ilike(pattern),
            )
        )
    if position:
        query = query.where(Player.position == position.upper())
    if team:
        query = query.where(Player.team == team.upper())

    query = query.order_by(Player.full_name).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_player_by_id(db: AsyncSession, player_id: str) -> Player | None:
    return await db.get(Player, player_id)


async def get_player_stats(
    db: AsyncSession,
    player_id: str,
    season: int | None = None,
    week: int | None = None,
) -> list[PlayerStats]:
    query = select(PlayerStats).where(PlayerStats.player_id == player_id)
    if season:
        query = query.where(PlayerStats.season == season)
    if week:
        query = query.where(PlayerStats.week == week)
    query = query.order_by(PlayerStats.season.desc(), PlayerStats.week.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_player_projections(
    db: AsyncSession,
    player_id: str,
    season: int | None = None,
    week: int | None = None,
) -> list[PlayerProjection]:
    query = select(PlayerProjection).where(PlayerProjection.player_id == player_id)
    if season:
        query = query.where(PlayerProjection.season == season)
    if week:
        query = query.where(PlayerProjection.week == week)
    query = query.order_by(PlayerProjection.season.desc(), PlayerProjection.week.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_trending(db: AsyncSession, trend_type: str = "add", limit: int = 25) -> list[dict]:
    """Fetch trending players from Sleeper and enrich with our DB data."""
    trending = await sleeper_client.get_trending_players(trend_type=trend_type, limit=limit)
    player_ids = [t["player_id"] for t in trending]

    result = await db.execute(select(Player).where(Player.id.in_(player_ids)))
    player_map = {p.id: p for p in result.scalars().all()}

    enriched = []
    for t in trending:
        pid = t["player_id"]
        player = player_map.get(pid)
        enriched.append({
            "player_id": pid,
            "count": t.get("count", 0),
            "player": {
                "id": player.id,
                "full_name": player.full_name,
                "first_name": player.first_name,
                "last_name": player.last_name,
                "position": player.position,
                "team": player.team,
                "status": player.status,
                "injury_status": player.injury_status,
                "age": player.age,
                "years_exp": player.years_exp,
            } if player else None,
        })
    return enriched


async def sync_all_players(db: AsyncSession) -> int:
    """Pull full player DB from Sleeper and upsert into our players table."""
    logger.info("Starting Sleeper player sync...")
    all_players = await sleeper_client.get_all_players()
    now = datetime.now(timezone.utc)
    count = 0

    for pid, data in all_players.items():
        position = data.get("position")
        # Only store fantasy-relevant positions
        if position not in FANTASY_POSITIONS:
            continue

        existing = await db.get(Player, pid)
        if existing:
            existing.full_name = data.get("full_name")
            existing.first_name = data.get("first_name")
            existing.last_name = data.get("last_name")
            existing.position = position
            existing.team = data.get("team")
            existing.status = data.get("status")
            existing.injury_status = data.get("injury_status")
            existing.age = data.get("age")
            existing.years_exp = data.get("years_exp")
            existing.metadata_ = {
                "number": data.get("number"),
                "height": data.get("height"),
                "weight": data.get("weight"),
                "college": data.get("college"),
                "depth_chart_order": data.get("depth_chart_order"),
            }
            existing.updated_at = now
        else:
            player = Player(
                id=pid,
                full_name=data.get("full_name"),
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                position=position,
                team=data.get("team"),
                status=data.get("status"),
                injury_status=data.get("injury_status"),
                age=data.get("age"),
                years_exp=data.get("years_exp"),
                metadata_={
                    "number": data.get("number"),
                    "height": data.get("height"),
                    "weight": data.get("weight"),
                    "college": data.get("college"),
                    "depth_chart_order": data.get("depth_chart_order"),
                },
                updated_at=now,
            )
            db.add(player)
        count += 1

    await db.commit()
    logger.info(f"Synced {count} players from Sleeper")
    return count


async def sync_weekly_stats(db: AsyncSession, season: int, week: int) -> int:
    """Pull weekly stats from Sleeper and upsert into player_stats."""
    logger.info(f"Syncing stats for {season} week {week}...")
    raw_stats = await sleeper_client.get_weekly_stats(season, week)
    count = 0

    for pid, stats in raw_stats.items():
        if not stats:
            continue

        pts_ppr = calculate_points(stats, "ppr")
        pts_half = calculate_points(stats, "half_ppr")
        pts_std = calculate_points(stats, "standard")

        # Check for existing
        result = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == pid,
                PlayerStats.season == season,
                PlayerStats.week == week,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.stats = stats
            existing.points_ppr = pts_ppr
            existing.points_half = pts_half
            existing.points_std = pts_std
        else:
            db.add(PlayerStats(
                player_id=pid,
                season=season,
                week=week,
                stats=stats,
                points_ppr=pts_ppr,
                points_half=pts_half,
                points_std=pts_std,
            ))
        count += 1

    await db.commit()
    logger.info(f"Synced stats for {count} players")
    return count


async def sync_weekly_projections(db: AsyncSession, season: int, week: int) -> int:
    """Pull weekly projections from Sleeper and upsert."""
    logger.info(f"Syncing projections for {season} week {week}...")
    raw = await sleeper_client.get_weekly_projections(season, week)
    now = datetime.now(timezone.utc)
    count = 0

    for pid, projections in raw.items():
        if not projections:
            continue

        pts_ppr = calculate_points(projections, "ppr")
        pts_half = calculate_points(projections, "half_ppr")
        pts_std = calculate_points(projections, "standard")

        result = await db.execute(
            select(PlayerProjection).where(
                PlayerProjection.player_id == pid,
                PlayerProjection.season == season,
                PlayerProjection.week == week,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.projections = projections
            existing.points_ppr = pts_ppr
            existing.points_half = pts_half
            existing.points_std = pts_std
            existing.updated_at = now
        else:
            db.add(PlayerProjection(
                player_id=pid,
                season=season,
                week=week,
                projections=projections,
                points_ppr=pts_ppr,
                points_half=pts_half,
                points_std=pts_std,
                updated_at=now,
            ))
        count += 1

    await db.commit()
    logger.info(f"Synced projections for {count} players")
    return count


async def get_player_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Player))
    return result.scalar_one()
