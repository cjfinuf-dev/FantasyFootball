"""Chat logic: messages, reactions, polls."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Message
from app.models.user import User
from app.services.roster_service import require_league_member
from app.utils.sanitize import sanitize_text


async def get_messages(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    before: uuid.UUID | None = None, limit: int = 50,
) -> list[dict]:
    """Get paginated messages (newest first). Cursor-based via 'before' message ID."""
    await require_league_member(db, league_id, user.id)

    query = (
        select(Message, User.username, User.avatar_url)
        .join(User, User.id == Message.user_id)
        .where(Message.league_id == league_id)
    )

    if before:
        # Get the created_at of the cursor message
        cursor_msg = await db.get(Message, before)
        if cursor_msg:
            query = query.where(Message.created_at < cursor_msg.created_at)

    query = query.order_by(desc(Message.created_at)).limit(limit)
    result = await db.execute(query)

    messages = []
    for msg, username, avatar_url in result.all():
        reactions = msg.metadata_.get("reactions", {}) if msg.metadata_ else {}
        messages.append({
            "id": msg.id,
            "league_id": msg.league_id,
            "user_id": msg.user_id,
            "username": username,
            "avatar_url": avatar_url,
            "content": msg.content,
            "message_type": msg.message_type,
            "metadata_": msg.metadata_,
            "created_at": msg.created_at,
            "reactions": reactions,
        })

    return messages


async def send_message(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    content: str, message_type: str = "text", metadata: dict | None = None,
) -> dict:
    """Send a new chat message."""
    await require_league_member(db, league_id, user.id)

    content = sanitize_text(content)
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = Message(
        league_id=league_id,
        user_id=user.id,
        content=content,
        message_type=message_type,
        metadata_=metadata,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {
        "id": msg.id,
        "league_id": msg.league_id,
        "user_id": msg.user_id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "content": msg.content,
        "message_type": msg.message_type,
        "metadata_": msg.metadata_,
        "created_at": msg.created_at,
        "reactions": {},
    }


async def add_reaction(
    db: AsyncSession, user: User, league_id: uuid.UUID, message_id: uuid.UUID, emoji: str,
) -> dict:
    """Toggle a reaction on a message."""
    await require_league_member(db, league_id, user.id)

    msg = await db.get(Message, message_id)
    if not msg or msg.league_id != league_id:
        raise HTTPException(status_code=404, detail="Message not found")

    metadata = msg.metadata_ or {}
    reactions = metadata.get("reactions", {})
    user_reactions = metadata.get("user_reactions", {})

    user_key = str(user.id)
    user_emojis = user_reactions.get(user_key, [])

    if emoji in user_emojis:
        # Remove reaction
        user_emojis.remove(emoji)
        reactions[emoji] = max(0, reactions.get(emoji, 1) - 1)
        if reactions[emoji] == 0:
            reactions.pop(emoji, None)
    else:
        # Add reaction
        user_emojis.append(emoji)
        reactions[emoji] = reactions.get(emoji, 0) + 1

    user_reactions[user_key] = user_emojis
    metadata["reactions"] = reactions
    metadata["user_reactions"] = user_reactions
    msg.metadata_ = metadata

    # Force SQLAlchemy to detect JSONB change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "metadata_")

    await db.commit()
    await db.refresh(msg)

    return {"message_id": message_id, "reactions": reactions}


async def create_poll(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    question: str, options: list[str],
) -> dict:
    """Create a poll as a special message type."""
    await require_league_member(db, league_id, user.id)

    question = sanitize_text(question)
    options = [sanitize_text(o) for o in options]

    metadata = {
        "question": question,
        "options": options,
        "votes": {},  # user_id -> option_index
        "vote_counts": [0] * len(options),
    }

    msg = Message(
        league_id=league_id,
        user_id=user.id,
        content=f"📊 {question}",
        message_type="poll",
        metadata_=metadata,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {
        "id": msg.id,
        "league_id": msg.league_id,
        "user_id": msg.user_id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "content": msg.content,
        "message_type": "poll",
        "metadata_": msg.metadata_,
        "created_at": msg.created_at,
        "reactions": {},
    }


async def vote_poll(
    db: AsyncSession, user: User, league_id: uuid.UUID,
    message_id: uuid.UUID, option_index: int,
) -> dict:
    """Vote on a poll. Changes vote if already voted."""
    await require_league_member(db, league_id, user.id)

    msg = await db.get(Message, message_id)
    if not msg or msg.league_id != league_id or msg.message_type != "poll":
        raise HTTPException(status_code=404, detail="Poll not found")

    metadata = msg.metadata_ or {}
    options = metadata.get("options", [])
    if option_index < 0 or option_index >= len(options):
        raise HTTPException(status_code=400, detail="Invalid option index")

    votes = metadata.get("votes", {})
    vote_counts = metadata.get("vote_counts", [0] * len(options))
    user_key = str(user.id)

    # Remove old vote if exists
    if user_key in votes:
        old_idx = votes[user_key]
        vote_counts[old_idx] = max(0, vote_counts[old_idx] - 1)

    # Apply new vote
    votes[user_key] = option_index
    vote_counts[option_index] += 1

    metadata["votes"] = votes
    metadata["vote_counts"] = vote_counts
    msg.metadata_ = metadata

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "metadata_")

    await db.commit()
    await db.refresh(msg)

    return {
        "message_id": message_id,
        "vote_counts": vote_counts,
        "total_votes": sum(vote_counts),
        "your_vote": option_index,
    }
