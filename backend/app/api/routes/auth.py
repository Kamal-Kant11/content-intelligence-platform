from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.security import hash_password, create_access_token, verify_password

from app.api.dependencies import get_current_user_id
from app.db.dependencies import get_database

from app.repositories.user import create_user, find_user_by_email, find_user_by_id
from app.schemas.auth import RegisterRequest, LoginRequest


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: RegisterRequest,
    db: AsyncDatabase = Depends(get_database),
):
    existing_user = await find_user_by_email(
        db=db,
        email=request.email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    password_hash = hash_password(request.password)

    user = await create_user(
        db=db,
        email=request.email,
        password_hash=password_hash,
        name=request.name,
    )

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
    }


@router.post("/login")
async def login(
    request: LoginRequest,
    db: AsyncDatabase = Depends(get_database),
):
    user = await find_user_by_email(
        db=db,
        email=request.email,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_is_valid = verify_password(
        request.password,
        user["password_hash"],
    )

    if not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        str(user["_id"]),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me")
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncDatabase = Depends(get_database),
):
    user = await find_user_by_id(
        db=db,
        user_id=user_id,
    )


    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
    }