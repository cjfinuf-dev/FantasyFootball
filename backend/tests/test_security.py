"""Security hardening tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.utils.security import create_refresh_token


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_weak_password_rejected(client: AsyncClient):
    """Password without digit should be rejected."""
    resp = await client.post("/api/auth/register", json={
        "email": "weak@test.com", "username": "weakuser", "password": "nodigitshere",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_short_password_rejected(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "short@test.com", "username": "shortpw", "password": "ab1",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_refresh_token_rejected_as_access(client: AsyncClient):
    """A refresh token should not work as an Authorization bearer."""
    # First register to get a valid user
    resp = await client.post("/api/auth/register", json={
        "email": "reftest@test.com", "username": "reftester", "password": "testpass1",
    })
    user_id = resp.json()["user"]["id"]
    refresh = create_refresh_token(user_id)

    # Try to use refresh token as access token
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {refresh}"})
    assert resp.status_code == 401
    assert "token type" in resp.json()["detail"].lower() or "Invalid" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_username_chars_rejected(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "badname@test.com", "username": "<script>alert(1)</script>", "password": "testpass1",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_html_in_league_name_sanitized(client: AsyncClient):
    """HTML tags should be stripped from league name."""
    auth_resp = await client.post("/api/auth/register", json={
        "email": "sanitize@test.com", "username": "sanitizer", "password": "testpass1",
    })
    token = auth_resp.json()["access_token"]
    resp = await client.post(
        "/api/leagues",
        json={"name": "<b>Bad League</b><script>alert(1)</script>", "num_teams": 4},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (200, 201)
    assert "<" not in resp.json()["name"]
    assert "Bad League" in resp.json()["name"]
