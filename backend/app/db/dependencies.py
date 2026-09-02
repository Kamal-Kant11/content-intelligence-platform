from pymongo.asynchronous.database import AsyncDatabase

from app.db.db import database


def get_database() -> AsyncDatabase:
    return database