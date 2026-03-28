import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    league_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leagues.id"), unique=True)
    type: Mapped[str] = mapped_column(String(20), default="snake")
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    pick_time_limit: Mapped[int] = mapped_column(Integer, default=90)
    rounds: Mapped[int] = mapped_column(Integer, default=15)
    draft_order: Mapped[list | None] = mapped_column(JSONB)
    current_pick: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DraftPick(Base):
    __tablename__ = "draft_picks"
    __table_args__ = ()

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draft_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drafts.id"))
    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("league_members.id"))
    player_id: Mapped[str] = mapped_column(String(20))
    round: Mapped[int] = mapped_column(Integer)
    pick_number: Mapped[int] = mapped_column(Integer)
    amount: Mapped[int | None] = mapped_column(Integer)
    picked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
