from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..data_store import DataNotFoundError
from ..services.llm import chat as run_chat

router = APIRouter(prefix="/api/users", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/{user_id}/chat", response_model=ChatResponse)
def chat(user_id: str, body: ChatRequest):
    try:
        reply = run_chat(user_id, body.message)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ChatResponse(reply=reply)
