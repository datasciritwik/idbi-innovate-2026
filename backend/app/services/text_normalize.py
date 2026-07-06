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


def _num_to_words(value, language: str) -> str:
    words_lang = language if language in _NUM2WORDS_LANGS else "en_IN"
    return num2words(value, lang=words_lang)


def _words_for_match(match: re.Match, language: str) -> str:
    currency, number, percent = match.groups()
    cleaned = number.replace(",", "")

    # Currency with a decimal → split rupees and paise so the model says
    # "one hundred one rupees and seventy-two paise" instead of the awkward
    # "one hundred one point seven two rupees" that num2words gives by
    # default. Paise is always a 2-digit fraction of a rupee, so ".7" → 70p
    # and ".725" → 72p (truncate, don't round; matches how banks display).
    if currency and "." in cleaned:
        rupees_part, paise_part = cleaned.split(".", 1)
        rupees = int(rupees_part) if rupees_part else 0
        paise_padded = (paise_part + "00")[:2]
        paise = int(paise_padded)
        rupees_words = _num_to_words(rupees, language)
        if paise > 0:
            paise_words = _num_to_words(paise, language)
            return f"{rupees_words} rupees and {paise_words} paise"
        return f"{rupees_words} rupees"

    value = float(cleaned) if "." in cleaned else int(cleaned)
    words = _num_to_words(value, language)
    if currency:
        words = f"{words} rupees"
    if percent:
        # No space in the source string means punctuation like "2.63%." can
        # end up with the number and "percent" separated by TTS pauses;
        # inserting an explicit space keeps the phrase together.
        words = f"{words} percent"
    return words


def normalize_numbers_for_speech(text: str, language: str = "en") -> str:
    return _NUMBER_RE.sub(lambda m: _words_for_match(m, language), text)
