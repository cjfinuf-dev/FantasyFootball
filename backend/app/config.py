import sys

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://fantasy:fantasy_dev@localhost:5432/fantasy_football"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "fantasy-football"
    JWT_AUDIENCE: str = "fantasy-football-app"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SLEEPER_BASE_URL: str = "https://api.sleeper.app/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:19006", "http://localhost:8081"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# Refuse to boot with the default JWT secret
if settings.JWT_SECRET in ("change-me", "change-me-to-a-random-secret"):
    print("FATAL: JWT_SECRET is still set to a placeholder. Generate a real secret:", file=sys.stderr)
    print("  python -c \"import secrets; print(secrets.token_urlsafe(64))\"", file=sys.stderr)
    sys.exit(1)
