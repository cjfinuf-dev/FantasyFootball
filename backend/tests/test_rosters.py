"""Roster endpoint tests."""

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
        json={"name": "Roster League", "num_teams": len(member_tokens) + 1},
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
async def test_get_my_roster_no_roster_yet(client: AsyncClient):
    auth = await _register(client, "rost1@test.com", "roster1")
    auth2 = await _register(client, "rost2@test.com", "roster2")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.get(f"/api/leagues/{lid}/rosters/me", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert resp.status_code == 200
    assert resp.json()["players"] == []


@pytest.mark.asyncio
async def test_get_all_rosters(client: AsyncClient):
    auth = await _register(client, "rost3@test.com", "roster3")
    auth2 = await _register(client, "rost4@test.com", "roster4")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.get(f"/api/leagues/{lid}/rosters", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_non_member_cannot_view_rosters(client: AsyncClient):
    auth = await _register(client, "rost5@test.com", "roster5")
    auth2 = await _register(client, "rost6@test.com", "roster6")
    outsider = await _register(client, "rost7@test.com", "roster7")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.get(f"/api/leagues/{lid}/rosters/me", headers={"Authorization": f"Bearer {outsider['access_token']}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_set_lineup_no_roster(client: AsyncClient):
    auth = await _register(client, "rost8@test.com", "roster8")
    auth2 = await _register(client, "rost9@test.com", "roster9")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.put(
        f"/api/leagues/{lid}/rosters/me/lineup",
        json={"lineup": {"QB": "123"}},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_add_player_not_found(client: AsyncClient):
    auth = await _register(client, "rosta@test.com", "rostera")
    auth2 = await _register(client, "rostb@test.com", "rosterb")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.post(
        f"/api/leagues/{lid}/rosters/me/add",
        json={"player_id": "nonexistent"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_drop_player_not_on_roster(client: AsyncClient):
    auth = await _register(client, "rostc@test.com", "rosterc")
    auth2 = await _register(client, "rostd@test.com", "rosterd")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    resp = await client.post(
        f"/api/leagues/{lid}/rosters/me/drop",
        json={"player_id": "123"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    # No roster → 404
    assert resp.status_code == 404
