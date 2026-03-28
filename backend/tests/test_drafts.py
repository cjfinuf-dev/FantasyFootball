"""Draft endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _register_and_login(client: AsyncClient, email: str, username: str):
    resp = await client.post("/api/auth/register", json={
        "email": email, "username": username, "password": "testpass123",
    })
    return resp.json()


async def _create_league_with_members(client: AsyncClient, commissioner_token: str, member_tokens: list[str]):
    """Create a league and have members join it. Returns league_id."""
    resp = await client.post(
        "/api/leagues",
        json={"name": "Test Draft League", "num_teams": len(member_tokens) + 1},
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    league = resp.json()
    league_id = league["id"]

    # Get invite code
    resp = await client.get(
        f"/api/leagues/{league_id}",
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    invite_code = resp.json()["invite_code"]

    for token in member_tokens:
        await client.post(
            f"/api/leagues/join",
            json={"invite_code": invite_code},
            headers={"Authorization": f"Bearer {token}"},
        )
    return league_id


@pytest.mark.asyncio
async def test_get_draft_creates_if_missing(client: AsyncClient):
    auth = await _register_and_login(client, "draft1@test.com", "drafter1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "draft2@test.com", "drafter2")
    token2 = auth2["access_token"]

    league_id = await _create_league_with_members(client, token, [token2])

    resp = await client.get(
        f"/api/leagues/{league_id}/draft",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "scheduled"
    assert data["type"] == "snake"


@pytest.mark.asyncio
async def test_update_draft_settings(client: AsyncClient):
    auth = await _register_and_login(client, "dset1@test.com", "dsetter1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dset2@test.com", "dsetter2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    resp = await client.put(
        f"/api/leagues/{league_id}/draft/settings",
        json={"type": "linear", "pick_time_limit": 60, "rounds": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["type"] == "linear"
    assert resp.json()["pick_time_limit"] == 60
    assert resp.json()["rounds"] == 10


@pytest.mark.asyncio
async def test_non_commissioner_cannot_change_settings(client: AsyncClient):
    auth = await _register_and_login(client, "dset3@test.com", "dsetter3")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dset4@test.com", "dsetter4")
    token2 = auth2["access_token"]

    league_id = await _create_league_with_members(client, token, [token2])

    resp = await client.put(
        f"/api/leagues/{league_id}/draft/settings",
        json={"type": "linear", "pick_time_limit": 60, "rounds": 10},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_randomize_draft_order(client: AsyncClient):
    auth = await _register_and_login(client, "dord1@test.com", "dorderer1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dord2@test.com", "dorderer2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    resp = await client.put(
        f"/api/leagues/{league_id}/draft/order",
        json={"order": [], "randomize": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["draft_order"] is not None
    assert len(data["draft_order"]) == 2


@pytest.mark.asyncio
async def test_start_draft(client: AsyncClient):
    auth = await _register_and_login(client, "dstart1@test.com", "dstarter1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dstart2@test.com", "dstarter2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{league_id}/draft/start",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["current_pick"] == 1
    assert data["started_at"] is not None


@pytest.mark.asyncio
async def test_cannot_start_draft_twice(client: AsyncClient):
    auth = await _register_and_login(client, "dtwice1@test.com", "dtwice1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dtwice2@test.com", "dtwice2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    await client.post(f"/api/leagues/{league_id}/draft/start", headers={"Authorization": f"Bearer {token}"})
    resp = await client.post(f"/api/leagues/{league_id}/draft/start", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_draft_board(client: AsyncClient):
    auth = await _register_and_login(client, "dboard1@test.com", "dboarder1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "dboard2@test.com", "dboarder2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    await client.post(f"/api/leagues/{league_id}/draft/start", headers={"Authorization": f"Bearer {token}"})

    resp = await client.get(
        f"/api/leagues/{league_id}/draft/board",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "draft" in data
    assert "picks" in data
    assert "members" in data
    assert data["draft"]["status"] == "in_progress"


@pytest.mark.asyncio
async def test_get_available_players(client: AsyncClient):
    auth = await _register_and_login(client, "davail1@test.com", "davail1")
    token = auth["access_token"]
    auth2 = await _register_and_login(client, "davail2@test.com", "davail2")

    league_id = await _create_league_with_members(client, token, [auth2["access_token"]])

    resp = await client.get(
        f"/api/leagues/{league_id}/draft/available",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
