import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class League(Base):
    __tablename__ = "leagues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    season: Mapped[int] = mapped_column(Integer, nullable=False)
    num_teams: Mapped[int] = mapped_column(Integer, default=12)
    scoring_type: Mapped[str] = mapped_column(String(20), default="ppr")
    roster_slots: Mapped[dict] = mapped_column(JSONB, default=lambda: {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1, "K": 1, "DEF": 1, "BN": 6})
    waiver_type: Mapped[str] = mapped_column(String(20), default="faab")
    faab_budget: Mapped[int] = mapped_column(Integer, default=100)
    trade_deadline: Mapped[date | None] = mapped_column(Date)
    playoff_teams: Mapped[int] = mapped_column(Integer, default=6)
    status: Mapped[str] = mapped_column(String(20), default="pre_draft")
    commissioner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    invite_code: Mapped[str | None] = mapped_column(String(20), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LeagueMember(Base):
    __tablename__ = "league_members"
    __table_args__ = (UniqueConstraint("league_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    league_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leagues.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    team_name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
