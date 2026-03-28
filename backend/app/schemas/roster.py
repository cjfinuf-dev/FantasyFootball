import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SetLineupRequest(BaseModel):
    lineup: dict[str, str]  # slot -> player_id


class AddDropRequest(BaseModel):
    player_id: str = Field(max_length=20)


class RosterPlayerResponse(BaseModel):
    player_id: str
    full_name: str | None = None
    position: str | None = None
    team: str | None = None
    slot: str
    points_this_week: float = 0.0
    acquired_via: str | None = None

    model_config = {"from_attributes": True}


class RosterResponse(BaseModel):
    id: uuid.UUID
    league_id: uuid.UUID
    member_id: uuid.UUID
    team_name: str | None = None
    username: str | None = None
    players: list[RosterPlayerResponse] = []

    model_config = {"from_attributes": True}
