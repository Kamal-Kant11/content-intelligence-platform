from datetime import datetime, timezone
from typing import Any


def create_document_document(
    user_id: str,
    title: str,
    source_type: str,
    blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    return {
        "user_id": user_id,
        "title": title,
        "source_type": source_type,
        "blocks": blocks,
        "created_at": now,
        "updated_at": now,
    }