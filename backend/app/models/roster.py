import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Roster(Base):
    __tablename__ = "rosters"
    __table_args__ = (UniqueConstraint("league_id", "member_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    league_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leagues.id"))
    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("league_members.id"))


class RosterPlayer(Base):
    __tablename__ = "roster_players"
    __table_args__ = (UniqueConstraint("roster_id", "player_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rosters.id"))
    player_id: Mapped[str] = mapped_column(String(20))
    slot: Mapped[str] = mapped_column(String(10))
    acquired_via: Mapped[str | None] = mapped_column(String(20))
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
