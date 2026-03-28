from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


class UserUpdate(BaseModel):
    username: str | None = None
    avatar_url: str | None = None


class PushTokenUpdate(BaseModel):
    push_token: str


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user, from_attributes=True)


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UserUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.username is not None:
        user.username = body.username
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user, from_attributes=True)


@router.put("/me/push-token")
async def set_push_token(body: PushTokenUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.push_token = body.push_token
    await db.commit()
    return {"status": "ok"}
