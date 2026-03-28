import uuid

from sqlalchemy import Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Matchup(Base):
    __tablename__ = "matchups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    league_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leagues.id"))
    week: Mapped[int] = mapped_column(Integer)
    team_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("league_members.id"))
    team_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("league_members.id"))
    team_a_score: Mapped[float] = mapped_column(Numeric(7, 2), default=0)
    team_b_score: Mapped[float] = mapped_column(Numeric(7, 2), default=0)
    is_playoff: Mapped[bool] = mapped_column(Boolean, default=False)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)
