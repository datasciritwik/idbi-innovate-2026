"""Lets the frontend force the LLM/TTS containers to cold-start on demand
(via a "Connect" button) instead of the user hitting that latency the first
time they send a chat message or fire a trigger.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends

from ..security.deps import require_session
from ..services import modal_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/warmup", tags=["warmup"])


async def _ping(name: str, bound_health_method) -> bool:
    try:
        return await modal_client.call_cancellable(bound_health_method)
    except modal_client.ModalUnavailable:
        return False
    except Exception as e:
        # health() itself failed on the container (e.g. @modal.enter's load()
        # crashed on gated HF weights or a bad pin) — surface it in logs and
        # return not-ready instead of 500-ing the whole warmup call so the
        # other services can still report their real state.
        logger.warning("%s warmup ping failed: %s", name, e)
        return False


@router.post("")
async def warmup(_ctx=Depends(require_session)):
    llm_ready, tts_ready, stt_ready = await asyncio.gather(
        _ping("llm", modal_client.llm().health),
        _ping("tts", modal_client.tts().health),
        _ping("stt", modal_client.stt().health),
    )
    return {"llm_ready": llm_ready, "tts_ready": tts_ready, "stt_ready": stt_ready}
