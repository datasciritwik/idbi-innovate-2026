"""Life-event triggers: the underlying data event is scripted (see
data/scripts/generate_transactions.py — 3 demo users each carry one baked-in
event at month 2026-02), but the before/after feature comparison and Vitta's
reaction are computed live from that data, not hardcoded strings.
"""
from typing import Awaitable

import pandas as pd
from fastapi import HTTPException

from .. import config
from .features import compute_features
from .llm import trigger_reaction_full

_month_index = pd.period_range(end=config.SIM_END_MONTH, periods=config.MONTHS_OF_HISTORY, freq="M")
TRIGGER_DATE = _month_index[config.TRIGGER_MONTH_OFFSET].to_timestamp()


def start_trigger(trigger_type: str, language: str = config.DEFAULT_LANGUAGE) -> tuple[dict, Awaitable[str]]:
    """Returns (meta dict with before/after feature deltas, awaitable for the
    LLM's full reply). Meta doesn't depend on the LLM call, so the caller can
    emit it right away and only await the reply when it needs the text."""
    user_id = config.TRIGGER_USER_MAP.get(trigger_type)
    if user_id is None:
        raise HTTPException(status_code=404, detail=f"Unknown trigger_type: {trigger_type}")

    before = compute_features(user_id, end_date=TRIGGER_DATE)
    after = compute_features(user_id, start_date=TRIGGER_DATE)
    meta = {
        "trigger_type": trigger_type,
        "user_id": user_id,
        "trigger_date": TRIGGER_DATE.strftime("%Y-%m-%d"),
        "before": before,
        "after": after,
    }
    reply_awaitable = trigger_reaction_full(trigger_type, before, after, user_id, language=language)
    return meta, reply_awaitable
