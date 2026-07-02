"""Speech-to-text via the self-hosted Whisper model — feeds the same text
chat pipeline the typed-input path uses. Gemma 4 12B (the LLM in use) doesn't
support audio input natively, so transcription happens as a separate step.
"""

import logging

from fastapi import HTTPException

from . import modal_client
from .. import config

logger = logging.getLogger(__name__)


async def transcribe(audio_bytes: bytes, language: str = config.DEFAULT_LANGUAGE) -> str:
    try:
        text = await modal_client.call_cancellable(modal_client.stt().transcribe, audio_bytes, language)
    except modal_client.ModalUnavailable:
        raise HTTPException(status_code=503, detail="Voice input isn't configured on the server.")
    return text.strip()
