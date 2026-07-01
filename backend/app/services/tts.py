"""Text-to-speech via the self-hosted Indic Parler-TTS endpoint.

Best-effort: if TTS isn't configured or the call fails, callers get None
back and fall through to text-only — a broken voice clip shouldn't take
down a chat reply that otherwise worked fine.
"""

import base64
import logging

import httpx

from .. import config

logger = logging.getLogger(__name__)


def synthesize(text: str, gender: str = config.DEFAULT_VOICE_GENDER) -> str | None:
    """Returns base64-encoded WAV audio, or None if TTS is unavailable."""
    if not config.TTS_ENDPOINT_URL:
        return None
    try:
        response = httpx.post(
            f"{config.TTS_ENDPOINT_URL}/synthesize",
            json={"text": text, "gender": gender},
            timeout=180.0,
            follow_redirects=True,
        )
        response.raise_for_status()
    except httpx.HTTPError as e:
        logger.warning("TTS synthesis failed, falling back to text-only: %s", e)
        return None
    return base64.b64encode(response.content).decode("ascii")
