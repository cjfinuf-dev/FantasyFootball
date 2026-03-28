"""Auth endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "securepass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "dupe@example.com",
        "username": "dupeuser",
        "password": "securepass123",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dupe@example.com",
        "username": "dupeuser2",
        "password": "securepass123",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@example.com",
        "username": "loginuser",
        "password": "securepass123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_bad_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "badpw@example.com",
        "username": "badpwuser",
        "password": "securepass123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "badpw@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "refresh@example.com",
        "username": "refreshuser",
        "password": "securepass123",
    })
    refresh_token = reg.json()["refresh_token"]
    resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "me@example.com",
        "username": "meuser",
        "password": "securepass123",
    })
    token = reg.json()["access_token"]
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "meuser"


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "update@example.com",
        "username": "updateuser",
        "password": "securepass123",
    })
    token = reg.json()["access_token"]
    resp = await client.patch(
        "/api/users/me",
        json={"username": "newname"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "newname"
