from typing import Any
from bson import ObjectId

from pymongo.asynchronous.database import AsyncDatabase

from app.models.user import create_user_document


async def find_user_by_id(
    db: AsyncDatabase,
    user_id: str,
) -> dict[str, Any] | None:
    return await db.users.find_one(
        {"_id": ObjectId(user_id)}
    )
    
    
async def find_user_by_email(
    db: AsyncDatabase,
    email: str,
) -> dict[str, Any] | None:
    return await db.users.find_one({"email": email})


async def create_user(
    db: AsyncDatabase,
    email: str,
    password_hash: str,
    name: str,
) -> dict[str, Any]:
    user = create_user_document(
        email=email,
        password_hash=password_hash,
        name=name,
    )

    result = await db.users.insert_one(user)

    user["_id"] = result.inserted_id

    return user


async def create_user_indexes(db: AsyncDatabase) -> None:
    await db.users.create_index(
        "email",
        unique=True,
    )