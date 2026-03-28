from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # Sleeper player_id
    full_name: Mapped[str | None] = mapped_column(String(100))
    first_name: Mapped[str | None] = mapped_column(String(50))
    last_name: Mapped[str | None] = mapped_column(String(50))
    position: Mapped[str | None] = mapped_column(String(10))
    team: Mapped[str | None] = mapped_column(String(5))
    status: Mapped[str | None] = mapped_column(String(30))
    injury_status: Mapped[str | None] = mapped_column(String(30))
    age: Mapped[int | None] = mapped_column(Integer)
    years_exp: Mapped[int | None] = mapped_column(Integer)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PlayerStats(Base):
    __tablename__ = "player_stats"
    __table_args__ = (UniqueConstraint("player_id", "season", "week"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String(20), index=True)
    season: Mapped[int] = mapped_column(Integer)
    week: Mapped[int] = mapped_column(Integer)
    stats: Mapped[dict] = mapped_column(JSONB, default=dict)
    points_ppr: Mapped[float | None] = mapped_column(Numeric(6, 2))
    points_half: Mapped[float | None] = mapped_column(Numeric(6, 2))
    points_std: Mapped[float | None] = mapped_column(Numeric(6, 2))


class PlayerProjection(Base):
    __tablename__ = "player_projections"
    __table_args__ = (UniqueConstraint("player_id", "season", "week"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String(20), index=True)
    season: Mapped[int] = mapped_column(Integer)
    week: Mapped[int] = mapped_column(Integer)
    projections: Mapped[dict] = mapped_column(JSONB, default=dict)
    points_ppr: Mapped[float | None] = mapped_column(Numeric(6, 2))
    points_half: Mapped[float | None] = mapped_column(Numeric(6, 2))
    points_std: Mapped[float | None] = mapped_column(Numeric(6, 2))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
