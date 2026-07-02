"""Lets the frontend force the LLM/TTS containers to cold-start on demand
(via a "Connect" button) instead of the user hitting that latency the first
time they send a chat message or fire a trigger.
"""

import asyncio

from fastapi import APIRouter, Depends

from ..security.deps import require_session
from ..services import modal_client

router = APIRouter(prefix="/api/warmup", tags=["warmup"])


async def _ping(bound_health_method) -> bool:
    try:
        return await modal_client.call_cancellable(bound_health_method)
    except modal_client.ModalUnavailable:
        return False


@router.post("")
async def warmup(_ctx=Depends(require_session)):
    llm_ready, tts_ready = await asyncio.gather(
        _ping(modal_client.llm().health), _ping(modal_client.tts().health)
    )
    return {"llm_ready": llm_ready, "tts_ready": tts_ready}
