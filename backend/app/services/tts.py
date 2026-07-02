"""Text-to-speech via the self-hosted Indic Parler-TTS model.

Best-effort: if TTS isn't configured or the call fails, callers get None
back and fall through to text-only — a broken voice clip shouldn't take
down a chat reply that otherwise worked fine.
"""

import asyncio
import base64
import logging

from . import modal_client
from .. import config

logger = logging.getLogger(__name__)


async def synthesize(
    text: str,
    gender: str = config.DEFAULT_VOICE_GENDER,
    language: str = config.DEFAULT_LANGUAGE,
) -> str | None:
    """Returns base64-encoded WAV audio, or None if TTS is unavailable."""
    try:
        audio_bytes = await modal_client.call_cancellable(modal_client.tts().synthesize, text, gender, language)
    except modal_client.ModalUnavailable:
        return None
    except asyncio.CancelledError:
        raise
    except Exception as e:
        logger.warning("TTS synthesis failed, falling back to text-only: %s", e)
        return None
    return base64.b64encode(audio_bytes).decode("ascii")
