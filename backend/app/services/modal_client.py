"""Shared Modal RPC plumbing for llm.py/stt.py/tts.py.

Replaces the old httpx calls to each model's @modal.asgi_app() HTTP endpoint
with direct calls to their @modal.method()s via Modal's Python client. Two
call shapes are supported:

  call_cancellable(method, *args)   — for single-result methods (transcribe,
                                       synthesize): spawns the call so it has
                                       a cancellable handle, then awaits it.
  stream_cancellable(method, *args) — for generator methods (generate_stream):
                                       an async generator over remote_gen().

Both propagate asyncio cancellation (from the caller's StreamingResponse
being torn down on client disconnect, e.g. barge-in) into an actual Modal
cancel call, instead of just abandoning the coroutine and letting the GPU
container run the stale request to completion.

ModalUnavailable is raised when the app/class named in config isn't deployed
yet (mirrors the old "endpoint URL not configured" case) — callers catch it
the same way they used to check `if not config.LLM_ENDPOINT_URL`.
"""

import asyncio
from functools import lru_cache
from typing import AsyncIterator

import modal

from .. import config


class ModalUnavailable(Exception):
    """Raised when the Modal app/class isn't deployed (yet)."""


@lru_cache(maxsize=None)
def _cls(class_name: str):
    return modal.Cls.from_name(config.MODAL_APP_NAME, class_name)


def _instance(class_name: str):
    try:
        return _cls(class_name)()
    except modal.exception.NotFoundError as e:
        raise ModalUnavailable(f"{config.MODAL_APP_NAME}.{class_name} is not deployed on Modal") from e


def llm() -> "modal.cls.Obj":
    return _instance(config.MODAL_LLM_CLASS)


def tts() -> "modal.cls.Obj":
    return _instance(config.MODAL_TTS_CLASS)


def stt() -> "modal.cls.Obj":
    return _instance(config.MODAL_STT_CLASS)


async def call_cancellable(bound_method, *args, **kwargs):
    """Awaits a single-result @modal.method(), cancelling the remote call
    (and terminating its container) if this coroutine itself is cancelled,
    instead of leaving it to run to completion unread."""
    try:
        call = await bound_method.spawn.aio(*args, **kwargs)
    except modal.exception.NotFoundError as e:
        raise ModalUnavailable(str(e)) from e

    try:
        return await call.get.aio()
    except asyncio.CancelledError:
        await call.cancel.aio(terminate_containers=True)
        raise


async def stream_cancellable(bound_method, *args, **kwargs) -> AsyncIterator:
    """Iterates a generator @modal.method(), closing the remote generator
    (which Modal treats as a stop signal, ending the in-flight call) if this
    generator is cancelled or abandoned mid-stream instead of drained fully."""
    gen = bound_method.remote_gen.aio(*args, **kwargs)
    try:
        async for piece in gen:
            yield piece
    except modal.exception.NotFoundError as e:
        raise ModalUnavailable(str(e)) from e
    finally:
        await gen.aclose()
