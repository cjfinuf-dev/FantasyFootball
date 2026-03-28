import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class DraftSettingsRequest(BaseModel):
    type: str = Field(default="snake", pattern="^(snake|linear)$")
    pick_time_limit: int = Field(default=90, ge=30, le=300)
    rounds: int = Field(default=15, ge=1, le=20)


class DraftOrderRequest(BaseModel):
    order: list[str]  # list of member_ids
    randomize: bool = False


class DraftPickRequest(BaseModel):
    player_id: str


class DraftPickResponse(BaseModel):
    id: uuid.UUID
    draft_id: uuid.UUID
    member_id: uuid.UUID
    player_id: str
    round: int
    pick_number: int
    amount: int | None = None
    picked_at: datetime
    player_name: str | None = None
    member_team_name: str | None = None

    model_config = {"from_attributes": True}


class DraftResponse(BaseModel):
    id: uuid.UUID
    league_id: uuid.UUID
    type: str
    status: str
    pick_time_limit: int
    rounds: int
    draft_order: list | None = None
    current_pick: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    total_picks: int = 0
    on_the_clock: str | None = None  # member_id of who picks next

    model_config = {"from_attributes": True}


class DraftBoardResponse(BaseModel):
    draft: DraftResponse
    picks: list[DraftPickResponse]
    members: list[dict]
