"""League endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _register_and_get_token(client: AsyncClient, email: str, username: str) -> str:
    resp = await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "securepass123",
    })
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_league(client: AsyncClient):
    token = await _register_and_get_token(client, "creator@test.com", "creator")
    resp = await client.post("/api/leagues", json={"name": "Test League"}, headers=_auth(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test League"
    assert data["status"] == "pre_draft"
    assert data["invite_code"] is not None
    assert data["scoring_type"] == "ppr"
    assert data["num_teams"] == 12


@pytest.mark.asyncio
async def test_list_my_leagues(client: AsyncClient):
    token = await _register_and_get_token(client, "lister@test.com", "lister")
    await client.post("/api/leagues", json={"name": "League A"}, headers=_auth(token))
    await client.post("/api/leagues", json={"name": "League B"}, headers=_auth(token))
    resp = await client.get("/api/leagues", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_join_by_code(client: AsyncClient):
    token1 = await _register_and_get_token(client, "commish@test.com", "commish")
    create_resp = await client.post("/api/leagues", json={"name": "Join Test"}, headers=_auth(token1))
    invite_code = create_resp.json()["invite_code"]

    token2 = await _register_and_get_token(client, "joiner@test.com", "joiner")
    resp = await client.post("/api/leagues/join-by-code", json={"invite_code": invite_code}, headers=_auth(token2))
    assert resp.status_code == 200
    assert resp.json()["role"] == "member"


@pytest.mark.asyncio
async def test_cannot_join_twice(client: AsyncClient):
    token1 = await _register_and_get_token(client, "commish2@test.com", "commish2")
    create_resp = await client.post("/api/leagues", json={"name": "Dupe Test"}, headers=_auth(token1))
    invite_code = create_resp.json()["invite_code"]

    token2 = await _register_and_get_token(client, "dupejoiner@test.com", "dupejoiner")
    await client.post("/api/leagues/join-by-code", json={"invite_code": invite_code}, headers=_auth(token2))
    resp = await client.post("/api/leagues/join-by-code", json={"invite_code": invite_code}, headers=_auth(token2))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_members(client: AsyncClient):
    token1 = await _register_and_get_token(client, "membcommish@test.com", "membcommish")
    create_resp = await client.post("/api/leagues", json={"name": "Members Test"}, headers=_auth(token1))
    league_id = create_resp.json()["id"]

    resp = await client.get(f"/api/leagues/{league_id}/members", headers=_auth(token1))
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 1
    assert members[0]["role"] == "commissioner"


@pytest.mark.asyncio
async def test_leave_league(client: AsyncClient):
    token1 = await _register_and_get_token(client, "leavecommish@test.com", "leavecommish")
    create_resp = await client.post("/api/leagues", json={"name": "Leave Test"}, headers=_auth(token1))
    invite_code = create_resp.json()["invite_code"]
    league_id = create_resp.json()["id"]

    token2 = await _register_and_get_token(client, "leaver@test.com", "leaver")
    await client.post("/api/leagues/join-by-code", json={"invite_code": invite_code}, headers=_auth(token2))

    resp = await client.post(f"/api/leagues/{league_id}/leave", headers=_auth(token2))
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_commissioner_cannot_leave(client: AsyncClient):
    token = await _register_and_get_token(client, "nocommleave@test.com", "nocommleave")
    create_resp = await client.post("/api/leagues", json={"name": "Comm Leave"}, headers=_auth(token))
    league_id = create_resp.json()["id"]

    resp = await client.post(f"/api/leagues/{league_id}/leave", headers=_auth(token))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_update_league_commissioner_only(client: AsyncClient):
    token1 = await _register_and_get_token(client, "updatecomm@test.com", "updatecomm")
    create_resp = await client.post("/api/leagues", json={"name": "Update Test"}, headers=_auth(token1))
    league_id = create_resp.json()["id"]
    invite_code = create_resp.json()["invite_code"]

    # Commissioner can update
    resp = await client.patch(f"/api/leagues/{league_id}", json={"name": "Updated Name"}, headers=_auth(token1))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"

    # Non-commissioner cannot
    token2 = await _register_and_get_token(client, "noncomm@test.com", "noncomm")
    await client.post("/api/leagues/join-by-code", json={"invite_code": invite_code}, headers=_auth(token2))
    resp = await client.patch(f"/api/leagues/{league_id}", json={"name": "Hacked"}, headers=_auth(token2))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_set_team_name(client: AsyncClient):
    token = await _register_and_get_token(client, "teamname@test.com", "teamname")
    create_resp = await client.post("/api/leagues", json={"name": "Team Name Test"}, headers=_auth(token))
    league_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/leagues/{league_id}/team-name", json={"team_name": "My Awesome Team"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["team_name"] == "My Awesome Team"


@pytest.mark.asyncio
async def test_standings(client: AsyncClient):
    token = await _register_and_get_token(client, "standings@test.com", "standings")
    create_resp = await client.post("/api/leagues", json={"name": "Standings Test"}, headers=_auth(token))
    league_id = create_resp.json()["id"]

    resp = await client.get(f"/api/leagues/{league_id}/standings", headers=_auth(token))
    assert resp.status_code == 200
    # With no matchups, standings should still return member list
    assert isinstance(resp.json(), list)
