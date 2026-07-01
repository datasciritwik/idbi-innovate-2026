from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from .. import config
from ..security.deps import SessionContext, require_quota, require_session
from ..security.gpu_gate import gpu_slot
from ..services import tts
from ..services.triggers import run_trigger

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
    response: Response,
    body: TriggerRequest | None = None,
    ctx: SessionContext = Depends(require_quota),
):
    body = body or TriggerRequest()
    language = body.language if body.language in config.SUPPORTED_LANGUAGES else config.DEFAULT_LANGUAGE
    gender = body.voice_gender if body.voice_gender in ("male", "female") else config.DEFAULT_VOICE_GENDER

    async with gpu_slot():
        result = run_trigger(trigger_type, language=language)
        result["audio_base64"] = tts.synthesize(result["reply"], gender=gender)

    response.headers["X-Quota-Remaining-Seconds"] = str(int(ctx.quota_remaining_seconds or 0))
    return result
