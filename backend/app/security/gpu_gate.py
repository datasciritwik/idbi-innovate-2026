"""Concurrency gate in front of GPU-bound work (guards the self-hosted
LLM/TTS endpoints, which only support a handful of concurrent calls at a
time) — once MAX_CONCURRENT_GPU_CALLS requests are in flight, new ones wait
up to GPU_QUEUE_TIMEOUT_SECONDS and then get told to back off, rather than
piling up indefinitely.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import HTTPException

from .. import config

_semaphore = asyncio.Semaphore(config.MAX_CONCURRENT_GPU_CALLS)
_waiting = 0
_waiting_lock = asyncio.Lock()


@asynccontextmanager
async def gpu_slot():
    """Blocks the caller until a GPU slot is free, or raises
    HTTPException(503) with Retry-After if none frees up in time — the
    frontend treats 503 here as "all concierge lines are busy" and retries."""
    global _waiting

    async with _waiting_lock:
        position = _waiting
        _waiting += 1

    try:
        try:
            await asyncio.wait_for(_semaphore.acquire(), timeout=config.GPU_QUEUE_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="All concierge lines are busy right now. Please try again shortly.",
                headers={"Retry-After": str(int(config.GPU_QUEUE_TIMEOUT_SECONDS))},
            )
        try:
            yield position
        finally:
            _semaphore.release()
    finally:
        async with _waiting_lock:
            _waiting -= 1
