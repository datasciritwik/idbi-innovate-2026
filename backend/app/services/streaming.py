"""Pipelines a full LLM reply into streamed TTS audio.

The LLM is called non-streaming — we wait for the full reply, then emit
it as a single text_delta event so the UI shows the full text at once.
TTS is where streaming happens: the reply is split into sentences, each
synthesized in order, and yielded as its own audio_chunk as soon as it's
ready. This lets playback start after only the first sentence's synthesis
time instead of the whole reply's.
"""

import re
from typing import AsyncIterator

from . import tts as tts_service
from .text_normalize import normalize_numbers_for_speech

# Splits on sentence-ending punctuation across the scripts our supported
# languages use (Latin ./!/?, Devanagari/Bengali/etc. danda ।, Urdu ؟).
_SENTENCE_BOUNDARY = re.compile(r"([.!?।؟]+[\"')\]]*\s*)")


def split_sentences(text: str) -> list[str]:
    parts = _SENTENCE_BOUNDARY.split(text)
    sentences = []
    i = 0
    while i + 1 < len(parts):
        sentence = (parts[i] + parts[i + 1]).strip()
        if sentence:
            sentences.append(sentence)
        i += 2
    if i < len(parts) and parts[i].strip():
        sentences.append(parts[i].strip())
    return sentences


async def stream_full_text_and_audio(
    full_text: str, gender: str, language: str
) -> AsyncIterator[dict]:
    """Yields, in order:
      {"type": "text_delta", "text": <full reply>}       (one event, the whole reply)
      {"type": "audio_chunk", "index": i, "audio_base64": ...}  (one per sentence, in order)
    Caller emits the final "done" event.
    """
    text = full_text.strip()
    if not text:
        return

    yield {"type": "text_delta", "text": text}

    for idx, sentence in enumerate(split_sentences(text)):
        speech_text = normalize_numbers_for_speech(sentence, language)
        audio_base64 = await tts_service.synthesize(speech_text, gender, language)
        yield {"type": "audio_chunk", "index": idx, "audio_base64": audio_base64}
