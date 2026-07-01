"""Expands digits into spoken words before text reaches the TTS model.

Indic Parler-TTS wasn't trained to pronounce raw digit strings (especially
currency like "₹10,532.94") reliably — left as-is, these come out as
garbled noise. This only touches the copy sent to TTS; the reply shown in
the chat UI keeps its original digits/symbols.
"""

import re

from num2words import num2words

# num2words only has dedicated support for a handful of our languages.
# For the rest we fall back to "en_IN" (Indian lakh/crore grouping) — still
# intelligible, and numbers are commonly code-switched into English in
# spoken Indian languages anyway.
_NUM2WORDS_LANGS = {"en", "bn", "kn", "te"}

_NUMBER_RE = re.compile(r"(₹\s*)?(\d[\d,]*(?:\.\d+)?)(\s*%)?")


def _words_for_match(match: re.Match, language: str) -> str:
    currency, number, percent = match.groups()
    cleaned = number.replace(",", "")
    value = float(cleaned) if "." in cleaned else int(cleaned)
    words_lang = language if language in _NUM2WORDS_LANGS else "en_IN"
    words = num2words(value, lang=words_lang)
    if currency:
        words = f"{words} rupees"
    if percent:
        words = f"{words} percent"
    return words


def normalize_numbers_for_speech(text: str, language: str = "en") -> str:
    return _NUMBER_RE.sub(lambda m: _words_for_match(m, language), text)
