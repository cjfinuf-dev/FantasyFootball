import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.utils.sanitize import sanitize_text


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    message_type: Literal["text", "poll", "reaction", "system"] = "text"
    metadata: dict | None = None

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, cls):
            v.content = sanitize_text(v.content)
        return v


class MessageResponse(BaseModel):
    id: uuid.UUID
    league_id: uuid.UUID
    user_id: uuid.UUID
    username: str | None = None
    avatar_url: str | None = None
    content: str
    message_type: str
    metadata_: dict | None = None
    created_at: datetime
    reactions: dict[str, int] = {}

    model_config = {"from_attributes": True}


class ReactionRequest(BaseModel):
    emoji: str = Field(min_length=1, max_length=10)


class PollCreate(BaseModel):
    question: str = Field(min_length=1, max_length=200)
    options: list[str] = Field(min_length=2, max_length=10)


class PollVote(BaseModel):
    option_index: int = Field(ge=0)
