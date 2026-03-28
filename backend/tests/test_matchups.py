"""Matchup endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _register(client: AsyncClient, email: str, username: str):
    resp = await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "testpass1",
    })
    return resp.json()


async def _create_league(client: AsyncClient, token: str, member_tokens: list[str]):
    resp = await client.post(
        "/api/leagues",
        json={"name": "Matchup League", "num_teams": len(member_tokens) + 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    league = resp.json()
    league_id = league["id"]
    resp2 = await client.get(f"/api/leagues/{league_id}", headers={"Authorization": f"Bearer {token}"})
    code = resp2.json()["invite_code"]
    for t in member_tokens:
        await client.post("/api/leagues/join", json={"invite_code": code}, headers={"Authorization": f"Bearer {t}"})
    return league_id


@pytest.mark.asyncio
async def test_generate_schedule(client: AsyncClient):
    auth = await _register(client, "match1@test.com", "matcher1")
    auth2 = await _register(client, "match2@test.com", "matcher2")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.post(
        f"/api/leagues/{lid}/matchups/generate?weeks=4",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert "matchups" in resp.json()["message"].lower() or "Generated" in resp.json()["message"]


@pytest.mark.asyncio
async def test_cannot_generate_schedule_twice(client: AsyncClient):
    auth = await _register(client, "match3@test.com", "matcher3")
    auth2 = await _register(client, "match4@test.com", "matcher4")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    await client.post(f"/api/leagues/{lid}/matchups/generate?weeks=4", headers={"Authorization": f"Bearer {auth['access_token']}"})
    resp = await client.post(f"/api/leagues/{lid}/matchups/generate?weeks=4", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_matchups_for_week(client: AsyncClient):
    auth = await _register(client, "match5@test.com", "matcher5")
    auth2 = await _register(client, "match6@test.com", "matcher6")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    await client.post(f"/api/leagues/{lid}/matchups/generate?weeks=4", headers={"Authorization": f"Bearer {auth['access_token']}"})

    resp = await client.get(f"/api/leagues/{lid}/matchups?week=1", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["week"] == 1
    assert "team_a_name" in data[0]


@pytest.mark.asyncio
async def test_non_member_cannot_view_matchups(client: AsyncClient):
    auth = await _register(client, "match7@test.com", "matcher7")
    auth2 = await _register(client, "match8@test.com", "matcher8")
    outsider = await _register(client, "match9@test.com", "matcher9")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.get(f"/api/leagues/{lid}/matchups?week=1", headers={"Authorization": f"Bearer {outsider['access_token']}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_score_week(client: AsyncClient):
    auth = await _register(client, "matcha@test.com", "matchera")
    auth2 = await _register(client, "matchb@test.com", "matcherb")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    await client.post(f"/api/leagues/{lid}/matchups/generate?weeks=4", headers={"Authorization": f"Bearer {auth['access_token']}"})

    resp = await client.post(f"/api/leagues/{lid}/matchups/score?week=1", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert resp.status_code == 200
