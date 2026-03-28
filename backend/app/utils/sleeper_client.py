"""Async client for the Sleeper API."""

import httpx

from app.config import settings

BASE = settings.SLEEPER_BASE_URL


async def get_all_players() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/players/nfl", timeout=60)
        resp.raise_for_status()
        return resp.json()


async def get_weekly_stats(season: int, week: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/stats/nfl/regular/{season}/{week}", timeout=30)
        resp.raise_for_status()
        return resp.json()


async def get_weekly_projections(season: int, week: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/projections/nfl/regular/{season}/{week}", timeout=30)
        resp.raise_for_status()
        return resp.json()


async def get_trending_players(sport: str = "nfl", trend_type: str = "add", limit: int = 25) -> list:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/players/{sport}/trending/{trend_type}", params={"limit": limit}, timeout=15)
        resp.raise_for_status()
        return resp.json()
