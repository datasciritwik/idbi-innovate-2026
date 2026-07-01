from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from .. import config
from ..data_store import DataNotFoundError
from ..security.deps import SessionContext, require_quota
from ..security.gpu_gate import gpu_slot
from ..services import tts
from ..services.llm import chat as run_chat

router = APIRouter(prefix="/api/users", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    language: str = config.DEFAULT_LANGUAGE
    voice_gender: str = config.DEFAULT_VOICE_GENDER


class ChatResponse(BaseModel):
    reply: str
    audio_base64: str | None = None


@router.post("/{user_id}/chat", response_model=ChatResponse)
async def chat(user_id: str, body: ChatRequest, response: Response, ctx: SessionContext = Depends(require_quota)):
    language = body.language if body.language in config.SUPPORTED_LANGUAGES else config.DEFAULT_LANGUAGE
    gender = body.voice_gender if body.voice_gender in ("male", "female") else config.DEFAULT_VOICE_GENDER

    async with gpu_slot():
        try:
            reply = run_chat(user_id, body.message, ctx.session_id, language=language)
        except DataNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        audio_base64 = tts.synthesize(reply, gender=gender)

    response.headers["X-Quota-Remaining-Seconds"] = str(int(ctx.quota_remaining_seconds or 0))
    return ChatResponse(reply=reply, audio_base64=audio_base64)
