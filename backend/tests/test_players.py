"""Player endpoint tests.

These tests work with the local DB (no Sleeper API calls).
We insert test players directly into the DB.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.database import async_session
from app.models.player import Player, PlayerStats


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _register_and_get_token(client: AsyncClient, email: str, username: str) -> str:
    resp = await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "securepass123",
    })
    return resp.json()["access_token"]


async def _seed_players():
    """Insert a handful of test players."""
    async with async_session() as db:
        players = [
            Player(id="4046", full_name="Patrick Mahomes", first_name="Patrick", last_name="Mahomes",
                   position="QB", team="KC", status="Active", age=29, years_exp=8),
            Player(id="6794", full_name="Ja'Marr Chase", first_name="Ja'Marr", last_name="Chase",
                   position="WR", team="CIN", status="Active", age=25, years_exp=4),
            Player(id="4034", full_name="Derrick Henry", first_name="Derrick", last_name="Henry",
                   position="RB", team="BAL", status="Active", age=31, years_exp=9),
            Player(id="4881", full_name="Travis Kelce", first_name="Travis", last_name="Kelce",
                   position="TE", team="KC", status="Active", age=35, years_exp=12),
            Player(id="2309", full_name="Justin Tucker", first_name="Justin", last_name="Tucker",
                   position="K", team="BAL", status="Active", age=35, years_exp=13),
        ]
        for p in players:
            existing = await db.get(Player, p.id)
            if not existing:
                db.add(p)

        # Add stats for Mahomes
        db.add(PlayerStats(
            player_id="4046", season=2025, week=1,
            stats={"pass_yd": 320, "pass_td": 3, "pass_int": 1, "rush_yd": 25, "rush_td": 0},
            points_ppr=22.6, points_half=22.6, points_std=22.6,
        ))
        db.add(PlayerStats(
            player_id="4046", season=2025, week=2,
            stats={"pass_yd": 280, "pass_td": 2, "pass_int": 0, "rush_yd": 15, "rush_td": 1},
            points_ppr=25.7, points_half=25.7, points_std=25.7,
        ))
        await db.commit()


@pytest.fixture(autouse=True)
async def seed():
    await _seed_players()


@pytest.mark.asyncio
async def test_search_all(client: AsyncClient):
    resp = await client.get("/api/players")
    assert resp.status_code == 200
    assert len(resp.json()) >= 5


@pytest.mark.asyncio
async def test_search_by_name(client: AsyncClient):
    resp = await client.get("/api/players", params={"search": "mahomes"})
    assert resp.status_code == 200
    results = resp.json()
    assert any(p["full_name"] == "Patrick Mahomes" for p in results)


@pytest.mark.asyncio
async def test_search_by_position(client: AsyncClient):
    resp = await client.get("/api/players", params={"position": "QB"})
    assert resp.status_code == 200
    assert all(p["position"] == "QB" for p in resp.json())


@pytest.mark.asyncio
async def test_search_by_team(client: AsyncClient):
    resp = await client.get("/api/players", params={"team": "KC"})
    assert resp.status_code == 200
    assert all(p["team"] == "KC" for p in resp.json())


@pytest.mark.asyncio
async def test_get_player_detail(client: AsyncClient):
    resp = await client.get("/api/players/4046")
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Patrick Mahomes"
    assert data["position"] == "QB"


@pytest.mark.asyncio
async def test_get_player_not_found(client: AsyncClient):
    resp = await client.get("/api/players/9999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_player_stats(client: AsyncClient):
    resp = await client.get("/api/players/4046/stats")
    assert resp.status_code == 200
    stats = resp.json()
    assert len(stats) >= 2
    assert stats[0]["season"] == 2025


@pytest.mark.asyncio
async def test_get_player_stats_by_week(client: AsyncClient):
    resp = await client.get("/api/players/4046/stats", params={"season": 2025, "week": 1})
    assert resp.status_code == 200
    stats = resp.json()
    assert len(stats) == 1
    assert stats[0]["week"] == 1
    assert stats[0]["stats"]["pass_td"] == 3


@pytest.mark.asyncio
async def test_player_count(client: AsyncClient):
    resp = await client.get("/api/players/count")
    assert resp.status_code == 200
    assert resp.json()["count"] >= 5
