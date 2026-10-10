from typing import Any
from bson import ObjectId

from pymongo.asynchronous.database import AsyncDatabase

from app.models.document import create_document_document


async def create_document(
    db: AsyncDatabase,
    user_id: str,
    title: str,
    source_type: str,
    blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    document = create_document_document(
        user_id=user_id,
        title=title,
        source_type=source_type,
        blocks=blocks,
    )

    result = await db.documents.insert_one(document)

    document["_id"] = result.inserted_id

    return document


async def find_documents_by_user(
    db: AsyncDatabase,
    user_id: str,
) -> list[dict[str, Any]]:
    cursor = db.documents.find(
        {
            "user_id": user_id,
        }
    ).sort("created_at", -1)

    return await cursor.to_list(length=None)


async def find_document_by_id(
    db: AsyncDatabase,
    document_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    return await db.documents.find_one(
        {
            "_id": ObjectId(document_id),
            "user_id": user_id,
        }
    )