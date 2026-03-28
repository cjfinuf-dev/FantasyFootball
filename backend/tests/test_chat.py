"""Chat endpoint tests."""

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
        json={"name": "Chat League", "num_teams": len(member_tokens) + 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    league = resp.json()
    lid = league["id"]
    resp2 = await client.get(f"/api/leagues/{lid}", headers={"Authorization": f"Bearer {token}"})
    code = resp2.json()["invite_code"]
    for t in member_tokens:
        await client.post("/api/leagues/join", json={"invite_code": code}, headers={"Authorization": f"Bearer {t}"})
    return lid


@pytest.mark.asyncio
async def test_get_messages_empty(client: AsyncClient):
    auth = await _register(client, "chat1@test.com", "chatter1")
    auth2 = await _register(client, "chat2@test.com", "chatter2")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.get(
        f"/api/leagues/{lid}/chat/messages",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_send_and_get_message(client: AsyncClient):
    auth = await _register(client, "chat3@test.com", "chatter3")
    auth2 = await _register(client, "chat4@test.com", "chatter4")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/chat/messages",
        json={"content": "Hello league!"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    msg = resp.json()
    assert msg["content"] == "Hello league!"
    assert msg["username"] == "chatter3"

    # Fetch messages
    resp2 = await client.get(
        f"/api/leagues/{lid}/chat/messages",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert len(resp2.json()) == 1


@pytest.mark.asyncio
async def test_non_member_cannot_send(client: AsyncClient):
    auth = await _register(client, "chat5@test.com", "chatter5")
    auth2 = await _register(client, "chat6@test.com", "chatter6")
    outsider = await _register(client, "chat7@test.com", "chatter7")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/chat/messages",
        json={"content": "Sneaky message"},
        headers={"Authorization": f"Bearer {outsider['access_token']}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_html_stripped_from_message(client: AsyncClient):
    auth = await _register(client, "chat8@test.com", "chatter8")
    auth2 = await _register(client, "chat9@test.com", "chatter9")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/chat/messages",
        json={"content": "<script>alert('xss')</script>Hello"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    assert "<script>" not in resp.json()["content"]
    assert "Hello" in resp.json()["content"]


@pytest.mark.asyncio
async def test_create_poll(client: AsyncClient):
    auth = await _register(client, "chata@test.com", "chattera")
    auth2 = await _register(client, "chatb@test.com", "chatterb")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    resp = await client.post(
        f"/api/leagues/{lid}/chat/polls",
        json={"question": "Who wins the Super Bowl?", "options": ["Chiefs", "Eagles", "49ers"]},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message_type"] == "poll"
    assert len(data["metadata_"]["options"]) == 3


@pytest.mark.asyncio
async def test_vote_poll(client: AsyncClient):
    auth = await _register(client, "chatc@test.com", "chatterc")
    auth2 = await _register(client, "chatd@test.com", "chatterd")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    # Create poll
    resp = await client.post(
        f"/api/leagues/{lid}/chat/polls",
        json={"question": "Best position?", "options": ["QB", "RB"]},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    poll_id = resp.json()["id"]

    # Vote
    resp2 = await client.post(
        f"/api/leagues/{lid}/chat/polls/{poll_id}/vote",
        json={"option_index": 0},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["vote_counts"][0] == 1
    assert resp2.json()["your_vote"] == 0


@pytest.mark.asyncio
async def test_react_to_message(client: AsyncClient):
    auth = await _register(client, "chate@test.com", "chattere")
    auth2 = await _register(client, "chatf@test.com", "chatterf")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    # Send message
    resp = await client.post(
        f"/api/leagues/{lid}/chat/messages",
        json={"content": "Great trade!"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    msg_id = resp.json()["id"]

    # React
    resp2 = await client.post(
        f"/api/leagues/{lid}/chat/messages/{msg_id}/react",
        json={"emoji": "🔥"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["reactions"]["🔥"] == 1

    # Toggle off
    resp3 = await client.post(
        f"/api/leagues/{lid}/chat/messages/{msg_id}/react",
        json={"emoji": "🔥"},
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert "🔥" not in resp3.json()["reactions"]


@pytest.mark.asyncio
async def test_message_pagination(client: AsyncClient):
    auth = await _register(client, "chatg@test.com", "chatterg")
    auth2 = await _register(client, "chath@test.com", "chatterh")
    lid = await _create_league(client, auth["access_token"], [auth2["access_token"]])

    # Send 3 messages
    msg_ids = []
    for i in range(3):
        resp = await client.post(
            f"/api/leagues/{lid}/chat/messages",
            json={"content": f"Message {i}"},
            headers={"Authorization": f"Bearer {auth['access_token']}"},
        )
        msg_ids.append(resp.json()["id"])

    # Get all
    resp = await client.get(
        f"/api/leagues/{lid}/chat/messages?limit=2",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert len(resp.json()) == 2

    # Paginate with cursor
    cursor = resp.json()[-1]["id"]
    resp2 = await client.get(
        f"/api/leagues/{lid}/chat/messages?before={cursor}&limit=2",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert len(resp2.json()) == 1
