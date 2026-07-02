import base64
import binascii
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .. import config
from ..data_store import DataNotFoundError, get_store
from ..security.deps import SessionContext, require_quota
from ..security.gpu_gate import gpu_slot
from ..services import stt
from ..services.llm import chat_stream
from ..services.streaming import stream_text_and_audio

router = APIRouter(prefix="/api/users", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    language: str = config.DEFAULT_LANGUAGE
    voice_gender: str = config.DEFAULT_VOICE_GENDER


class VoiceChatRequest(BaseModel):
    audio_base64: str
    language: str = config.DEFAULT_LANGUAGE
    voice_gender: str = config.DEFAULT_VOICE_GENDER


def _resolve_voice_params(language: str, voice_gender: str) -> tuple[str, str]:
    resolved_language = language if language in config.SUPPORTED_LANGUAGES else config.DEFAULT_LANGUAGE
    resolved_gender = voice_gender if voice_gender in ("male", "female") else config.DEFAULT_VOICE_GENDER
    return resolved_language, resolved_gender


@router.post("/{user_id}/chat")
async def chat(user_id: str, body: ChatRequest, ctx: SessionContext = Depends(require_quota)):
    """Streams the reply as newline-delimited JSON events (text_delta,
    audio_chunk, done) — the text and its per-sentence audio arrive
    incrementally instead of waiting for the full reply to finish."""
    try:
        get_store().get_user(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    language, gender = _resolve_voice_params(body.language, body.voice_gender)

    async def event_stream():
        async with gpu_slot():
            text_stream = chat_stream(user_id, body.message, ctx.session_id, language=language)
            async for event in stream_text_and_audio(text_stream, gender, language):
                yield json.dumps(event) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    headers = {"X-Quota-Remaining-Seconds": str(int(ctx.quota_remaining_seconds or 0))}
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)


@router.post("/{user_id}/voice-chat")
async def voice_chat(user_id: str, body: VoiceChatRequest, ctx: SessionContext = Depends(require_quota)):
    """Same as /chat, but the message is a recorded audio clip — transcribed
    first (emitting a `transcript` event so the frontend can show what the
    user said), then fed into the same text/audio reply pipeline."""
    try:
        get_store().get_user(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        audio_bytes = base64.b64decode(body.audio_base64, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(status_code=400, detail="audio_base64 is not valid base64.")

    language, gender = _resolve_voice_params(body.language, body.voice_gender)

    async def event_stream():
        async with gpu_slot():
            message = await stt.transcribe(audio_bytes, language)
            yield json.dumps({"type": "transcript", "text": message}) + "\n"
            if message.strip():
                text_stream = chat_stream(user_id, message, ctx.session_id, language=language)
                async for event in stream_text_and_audio(text_stream, gender, language):
                    yield json.dumps(event) + "\n"
            else:
                yield json.dumps({"type": "error", "detail": "Didn't catch that — try again."}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    headers = {"X-Quota-Remaining-Seconds": str(int(ctx.quota_remaining_seconds or 0))}
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)
