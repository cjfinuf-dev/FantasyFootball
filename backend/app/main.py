from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.middleware.rate_limit import limiter
from app.routers import auth, users, leagues, drafts, rosters, matchups, players, transactions, chat, notifications
from app.ws import draft_ws, chat_ws, scores_ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (dev only — use Alembic in production)
    from app.database import engine
    from app.models.user import Base
    # Import all models so Base.metadata knows about them
    import app.models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(title="Fantasy Football", version="0.1.0", lifespan=lifespan)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leagues.router)
app.include_router(drafts.router)
app.include_router(rosters.router)
app.include_router(matchups.router)
app.include_router(players.router)
app.include_router(transactions.router)
app.include_router(chat.router)
app.include_router(notifications.router)

# WebSocket routers
app.include_router(draft_ws.router)
app.include_router(chat_ws.router)
app.include_router(scores_ws.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
