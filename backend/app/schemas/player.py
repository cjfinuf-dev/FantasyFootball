from datetime import datetime
from pydantic import BaseModel


class PlayerResponse(BaseModel):
    id: str
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    position: str | None = None
    team: str | None = None
    status: str | None = None
    injury_status: str | None = None
    age: int | None = None
    years_exp: int | None = None

    model_config = {"from_attributes": True}


class PlayerDetailResponse(PlayerResponse):
    updated_at: datetime | None = None


class PlayerStatsResponse(BaseModel):
    player_id: str
    season: int
    week: int
    stats: dict
    points_ppr: float | None = None
    points_half: float | None = None
    points_std: float | None = None

    model_config = {"from_attributes": True}


class PlayerProjectionResponse(BaseModel):
    player_id: str
    season: int
    week: int
    projections: dict
    points_ppr: float | None = None
    points_half: float | None = None
    points_std: float | None = None

    model_config = {"from_attributes": True}


class TrendingPlayerResponse(BaseModel):
    player_id: str
    count: int
    player: PlayerResponse | None = None


class SyncStatusResponse(BaseModel):
    players_synced: int
    message: str
