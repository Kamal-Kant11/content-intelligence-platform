from datetime import datetime, timezone
from typing import Any


def create_user_document(
    email: str,
    password_hash: str,
    name: str,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    return {
        "email": email,
        "password_hash": password_hash,
        "name": name,
        "created_at": now,
        "updated_at": now,
    }