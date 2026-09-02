from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings


client = AsyncMongoClient(settings.mongodb_url)

database: AsyncDatabase = client[settings.database_name]


async def connect_to_db() -> None:
    await client.admin.command("ping")
    print("Connected to MongoDB")


async def close_db_connection() -> None:
    await client.close()
    print("MongoDB connection closed")