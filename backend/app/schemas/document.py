from typing import Literal

from pydantic import BaseModel, Field


class CreateDocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_type: Literal["text"]
    content: str = Field(min_length=1)