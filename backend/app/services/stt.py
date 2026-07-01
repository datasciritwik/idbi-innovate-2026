"""Speech-to-text via the self-hosted Whisper endpoint — feeds the same text
chat pipeline the typed-input path uses. Gemma 4 12B (the LLM in use) doesn't
support audio input natively, so transcription happens as a separate step.
"""

import base64
import logging

import httpx
from fastapi import HTTPException

from .. import config

logger = logging.getLogger(__name__)


def transcribe(audio_bytes: bytes, language: str = config.DEFAULT_LANGUAGE) -> str:
    if not config.STT_ENDPOINT_URL:
        raise HTTPException(status_code=503, detail="Voice input isn't configured on the server.")
    try:
        response = httpx.post(
            f"{config.STT_ENDPOINT_URL}/transcribe",
            json={"audio_base64": base64.b64encode(audio_bytes).decode("ascii"), "language": language},
            timeout=180.0,
            follow_redirects=True,
        )
        response.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Speech-to-text request failed: {e}")
    return response.json()["text"].strip()
