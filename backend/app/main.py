from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.db.db import database, connect_to_db, close_db_connection

from app.repositories.user import create_user_indexes

from app.api.routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_db()
    await create_user_indexes(database)

    yield

    await close_db_connection()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)


app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "message": "Hello World", 
        "app_name": settings.app_name, 
        "environment": settings.environment
    }