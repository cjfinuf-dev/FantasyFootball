import uuid

from pydantic import BaseModel

from app.schemas.roster import RosterPlayerResponse


class MatchupResponse(BaseModel):
    id: uuid.UUID
    week: int
    team_a_id: uuid.UUID
    team_b_id: uuid.UUID
    team_a_name: str | None = None
    team_b_name: str | None = None
    team_a_score: float
    team_b_score: float
    is_playoff: bool
    is_complete: bool

    model_config = {"from_attributes": True}


class MatchupDetailResponse(BaseModel):
    matchup: MatchupResponse
    team_a_roster: list[RosterPlayerResponse] = []
    team_b_roster: list[RosterPlayerResponse] = []


class WeekScheduleResponse(BaseModel):
    week: int
    matchups: list[MatchupResponse]
