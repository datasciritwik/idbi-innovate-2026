import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .. import config
from ..security.deps import SessionContext, require_quota, require_session
from ..security.gpu_gate import gpu_slot
from ..services.streaming import stream_full_text_and_audio
from ..services.triggers import start_trigger

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


class TriggerRequest(BaseModel):
    language: str = config.DEFAULT_LANGUAGE
    voice_gender: str = config.DEFAULT_VOICE_GENDER


@router.get("", dependencies=[Depends(require_session)])
def list_triggers():
    return [{"trigger_type": t, "user_id": u} for t, u in config.TRIGGER_USER_MAP.items()]


@router.post("/{trigger_type}")
async def fire_trigger(
    trigger_type: str,
    body: TriggerRequest | None = None,
    ctx: SessionContext = Depends(require_quota),
):
    """Streams the reaction as newline-delimited JSON events (meta,
    text_delta, audio_chunk, done) — meta (before/after numbers) arrives
    immediately, then the reply streams in with its audio close behind."""
    body = body or TriggerRequest()
    language = body.language if body.language in config.SUPPORTED_LANGUAGES else config.DEFAULT_LANGUAGE
    gender = body.voice_gender if body.voice_gender in ("male", "female") else config.DEFAULT_VOICE_GENDER

    # Resolved eagerly (not inside the generator) so an unknown trigger_type
    # still surfaces as a real 404 rather than a mid-stream error event.
    meta, reply_awaitable = start_trigger(trigger_type, language=language)

    async def event_stream():
        yield json.dumps({"type": "meta", **meta}) + "\n"
        async with gpu_slot():
            reply = await reply_awaitable
            async for event in stream_full_text_and_audio(reply, gender, language):
                yield json.dumps(event) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    headers = {"X-Quota-Remaining-Seconds": str(int(ctx.quota_remaining_seconds or 0))}
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)
