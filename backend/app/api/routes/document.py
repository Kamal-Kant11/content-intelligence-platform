from fastapi import APIRouter, Depends, status, HTTPException
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies import get_current_user_id
from app.db.dependencies import get_database

from app.repositories.document import create_document, find_documents_by_user, find_document_by_id

from app.schemas.document import CreateDocumentRequest
from app.services.content_service import parse_content


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_document_route(
    request: CreateDocumentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncDatabase = Depends(get_database),
):
    blocks = parse_content(request.content)

    document = await create_document(
        db=db,
        user_id=user_id,
        title=request.title,
        source_type=request.source_type,
        blocks=blocks,
    )

    return {
        "id": str(document["_id"]),
        "title": document["title"],
        "source_type": document["source_type"],
        "blocks": document["blocks"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


@router.get("")
async def get_documents(
    user_id: str = Depends(get_current_user_id),
    db: AsyncDatabase = Depends(get_database),
):
    documents = await find_documents_by_user(
        db=db,
        user_id=user_id,
    )

    return [
        {
            "id": str(document["_id"]),
            "title": document["title"],
            "source_type": document["source_type"],
            "created_at": document["created_at"],
            "updated_at": document["updated_at"],
        }
        for document in documents
    ]


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncDatabase = Depends(get_database),
):
    document = await find_document_by_id(
        db=db,
        document_id=document_id,
        user_id=user_id,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return {
        "id": str(document["_id"]),
        "title": document["title"],
        "source_type": document["source_type"],
        "blocks": document["blocks"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }