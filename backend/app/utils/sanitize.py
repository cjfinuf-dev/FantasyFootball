"""Input sanitization for user-facing text fields."""

import bleach


def sanitize_text(value: str) -> str:
    """Strip all HTML tags from user input."""
    return bleach.clean(value, tags=[], strip=True).strip()
