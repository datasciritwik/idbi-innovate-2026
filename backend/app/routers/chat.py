from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from ..data_store import DataNotFoundError
from ..security.deps import SessionContext, require_quota
from ..security.gpu_gate import gpu_slot
from ..services.llm import chat as run_chat

router = APIRouter(prefix="/api/users", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/{user_id}/chat", response_model=ChatResponse)
async def chat(user_id: str, body: ChatRequest, response: Response, ctx: SessionContext = Depends(require_quota)):
    async with gpu_slot():
        try:
            reply = run_chat(user_id, body.message, ctx.session_id)
        except DataNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
    response.headers["X-Quota-Remaining-Seconds"] = str(int(ctx.quota_remaining_seconds or 0))
    return ChatResponse(reply=reply)
