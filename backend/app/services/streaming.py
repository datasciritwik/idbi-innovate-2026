"""Pipelines an LLM text stream into per-sentence TTS audio.

As text deltas arrive we accumulate them and, on every completed sentence,
kick off that sentence's TTS synthesis as a background task immediately —
while the LLM keeps generating the next sentence on its own GPU. Audio
chunks are only ever yielded once earlier chunks are ready, so playback
order on the frontend stays correct even though synthesis happens out of
lockstep with generation.
"""

import asyncio
import re
from typing import AsyncIterator

from . import tts as tts_service
from .text_normalize import normalize_numbers_for_speech

# Splits on sentence-ending punctuation across the scripts our supported
# languages use (Latin ./!/?, Devanagari/Bengali/etc. danda ।, Urdu ؟).
_SENTENCE_BOUNDARY = re.compile(r"([.!?।؟]+[\"')\]]*\s*)")


def split_sentences(buffer: str) -> tuple[list[str], str]:
    """Returns (complete sentences found so far, leftover unterminated text)."""
    parts = _SENTENCE_BOUNDARY.split(buffer)
    sentences = []
    i = 0
    while i + 1 < len(parts):
        sentence = (parts[i] + parts[i + 1]).strip()
        if sentence:
            sentences.append(sentence)
        i += 2
    remainder = parts[i] if i < len(parts) else ""
    return sentences, remainder


async def _synthesize_async(text: str, gender: str, language: str) -> str | None:
    speech_text = normalize_numbers_for_speech(text, language)
    return await tts_service.synthesize(speech_text, gender, language)


async def stream_text_and_audio(
    text_stream: AsyncIterator[str], gender: str, language: str
) -> AsyncIterator[dict]:
    """Consumes an async iterator of text deltas. Yields, in order:
    {"type": "text_delta", "text": ...} for every delta, as it arrives, and
    {"type": "audio_chunk", "index": ..., "audio_base64": ...} once each
    sentence's audio is ready. Caller emits the final "done" event.
    """
    buffer = ""
    pending: list[tuple[int, asyncio.Task]] = []
    next_index = 0

    async for delta in text_stream:
        buffer += delta
        yield {"type": "text_delta", "text": delta}

        sentences, buffer = split_sentences(buffer)
        for sentence in sentences:
            idx = next_index
            next_index += 1
            pending.append((idx, asyncio.create_task(_synthesize_async(sentence, gender, language))))

        while pending and pending[0][1].done():
            idx, task = pending.pop(0)
            yield {"type": "audio_chunk", "index": idx, "audio_base64": task.result()}

    if buffer.strip():
        idx = next_index
        next_index += 1
        pending.append((idx, asyncio.create_task(_synthesize_async(buffer.strip(), gender, language))))

    for idx, task in pending:
        yield {"type": "audio_chunk", "index": idx, "audio_base64": await task}
