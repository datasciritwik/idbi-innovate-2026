"""Lets the frontend force the LLM/TTS containers to cold-start on demand
(via a "Connect" button) instead of the user hitting that latency the first
time they send a chat message or fire a trigger.
"""

import asyncio

import httpx
from fastapi import APIRouter, Depends

from .. import config
from ..security.deps import require_session

router = APIRouter(prefix="/api/warmup", tags=["warmup"])


async def _ping(url: str | None) -> bool:
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=200.0) as client:
            response = await client.get(f"{url}/health", follow_redirects=True)
            return response.status_code == 200
    except httpx.HTTPError:
        return False


@router.post("")
async def warmup(_ctx=Depends(require_session)):
    llm_ready, tts_ready = await asyncio.gather(
        _ping(config.LLM_ENDPOINT_URL), _ping(config.TTS_ENDPOINT_URL)
    )
    return {"llm_ready": llm_ready, "tts_ready": tts_ready}
