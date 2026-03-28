"""Transaction endpoint tests: trades & waivers."""

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
        json={"name": "Txn League", "num_teams": len(member_tokens) + 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    league = resp.json()
    lid = league["id"]
    resp2 = await client.get(f"/api/leagues/{lid}", headers={"Authorization": f"Bearer {token}"})
    code = resp2.json()["invite_code"]
    for t in member_tokens:
        await client.post("/api/leagues/join", json={"invite_code": code}, headers={"Authorization": f"Bearer {t}"})
    return lid


async def _get_members(client: AsyncClient, lid: str, token: str):
    resp = await client.get(f"/api/leagues/{lid}/members", headers={"Authorization": f"Bearer {token}"})
    return resp.json()


@pytest.mark.asyncio
async def test_list_transactions_empty(client: AsyncClient):
    auth = await _register(client, "txn1@test.com", "txnuser1")
    auth2 = await _register(client, "txn2@test.com", "txnuser2")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.get(
        f"/api/leagues/{lid}/transactions",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_non_member_cannot_list_transactions(client: AsyncClient):
    auth = await _register(client, "txn3@test.com", "txnuser3")
    auth2 = await _register(client, "txn4@test.com", "txnuser4")
    outsider = await _register(client, "txn5@test.com", "txnuser5")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.get(
        f"/api/leagues/{lid}/transactions",
        headers={"Authorization": f"Bearer {outsider['access_token']}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_waiver_claim_player_not_found(client: AsyncClient):
    auth = await _register(client, "txn6@test.com", "txnuser6")
    auth2 = await _register(client, "txn7@test.com", "txnuser7")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/transactions/waiver",
        json={"player_id": "nonexistent", "bid_amount": 10},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_trade_self_rejected(client: AsyncClient):
    auth = await _register(client, "txn8@test.com", "txnuser8")
    auth2 = await _register(client, "txn9@test.com", "txnuser9")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])
    members = await _get_members(client, lid, auth["access_token"])
    my_member = next(m for m in members if m["role"] == "commissioner")

    resp = await client.post(
        f"/api/leagues/{lid}/transactions/trade",
        json={
            "to_member_id": my_member["id"],
            "send_player_ids": ["p1"],
            "receive_player_ids": ["p2"],
        },
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 400
    assert "yourself" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_process_waivers_non_commissioner(client: AsyncClient):
    auth = await _register(client, "txna@test.com", "txnusera")
    auth2 = await _register(client, "txnb@test.com", "txnuserb")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/transactions/waivers/process",
        headers={"Authorization": f"Bearer {auth2['access_token']}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_process_waivers_empty(client: AsyncClient):
    auth = await _register(client, "txnc@test.com", "txnuserc")
    auth2 = await _register(client, "txnd@test.com", "txnuserd")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/transactions/waivers/process",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert "0" in resp.json()["message"]


@pytest.mark.asyncio
async def test_filter_transactions_by_type(client: AsyncClient):
    auth = await _register(client, "txne@test.com", "txnusere")
    auth2 = await _register(client, "txnf@test.com", "txnuserf")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.get(
        f"/api/leagues/{lid}/transactions?type=trade",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []
