import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TradeProposal(BaseModel):
    to_member_id: uuid.UUID
    send_player_ids: list[str] = Field(min_length=1, max_length=10)
    receive_player_ids: list[str] = Field(min_length=1, max_length=10)


class WaiverClaim(BaseModel):
    player_id: str = Field(max_length=20)
    drop_player_id: str | None = Field(default=None, max_length=20)
    bid_amount: int = Field(default=0, ge=0, le=1000)


class TransactionAction(BaseModel):
    """Accept, reject, veto, or cancel a transaction."""
    action: str = Field(pattern=r"^(accept|reject|veto|cancel)$")


class TransactionResponse(BaseModel):
    id: uuid.UUID
    league_id: uuid.UUID
    type: str
    status: str
    proposed_by: uuid.UUID
    proposed_by_name: str | None = None
    proposed_at: datetime
    resolved_at: datetime | None = None
    details: dict

    model_config = {"from_attributes": True}
