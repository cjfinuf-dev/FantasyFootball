import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.utils.sanitize import sanitize_text

DEFAULT_ROSTER_SLOTS = {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1, "K": 1, "DEF": 1, "BN": 6}

VALID_POSITIONS = {"QB", "RB", "WR", "TE", "FLEX", "K", "DEF", "BN", "SUPERFLEX", "IDP"}


class LeagueCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    season: int = 2026
    num_teams: int = Field(default=12, ge=4, le=20)
    scoring_type: Literal["ppr", "half_ppr", "standard"] = "ppr"
    roster_slots: dict | None = None
    waiver_type: Literal["faab", "rolling"] = "faab"
    faab_budget: int = Field(default=100, ge=0, le=1000)
    trade_deadline: date | None = None
    playoff_teams: int = Field(default=6, ge=2, le=16)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("roster_slots")
    @classmethod
    def validate_roster_slots(cls, v: dict | None) -> dict | None:
        if v is None:
            return v
        for key, count in v.items():
            if key not in VALID_POSITIONS:
                raise ValueError(f"Invalid roster slot: {key}")
            if not isinstance(count, int) or count < 0 or count > 10:
                raise ValueError(f"Invalid count for {key}: must be 0-10")
        return v


class LeagueUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    scoring_type: Literal["ppr", "half_ppr", "standard"] | None = None
    roster_slots: dict | None = None
    waiver_type: Literal["faab", "rolling"] | None = None
    faab_budget: int | None = Field(default=None, ge=0, le=1000)
    trade_deadline: date | None = None
    playoff_teams: int | None = Field(default=None, ge=2, le=16)
    num_teams: int | None = Field(default=None, ge=4, le=20)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str | None) -> str | None:
        return sanitize_text(v) if v else v


class LeagueResponse(BaseModel):
    id: uuid.UUID
    name: str
    season: int
    num_teams: int
    scoring_type: str
    roster_slots: dict
    waiver_type: str
    faab_budget: int
    trade_deadline: date | None = None
    playoff_teams: int
    status: str
    commissioner_id: uuid.UUID
    invite_code: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeagueMemberResponse(BaseModel):
    id: uuid.UUID
    league_id: uuid.UUID
    user_id: uuid.UUID
    team_name: str | None = None
    role: str
    joined_at: datetime
    username: str | None = None

    model_config = {"from_attributes": True}


class JoinByCodeRequest(BaseModel):
    invite_code: str = Field(max_length=20)


class SetTeamNameRequest(BaseModel):
    team_name: str = Field(min_length=1, max_length=100)

    @field_validator("team_name")
    @classmethod
    def sanitize_team_name(cls, v: str) -> str:
        return sanitize_text(v)
