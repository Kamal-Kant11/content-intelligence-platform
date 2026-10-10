from typing import Any
from uuid import uuid4


def create_block(
    block_type: str,
    order: int,
    content: str,
) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "type": block_type,
        "order": order,
        "content": content,
    }