"""Life-event triggers: the underlying data event is scripted (see
data/scripts/generate_transactions.py — 3 demo users each carry one baked-in
event at month 2026-02), but the before/after feature comparison and Wren's
reaction are computed live from that data, not hardcoded strings.
"""
import pandas as pd
from fastapi import HTTPException

from .. import config
from .features import compute_features
from .llm import trigger_reaction

_month_index = pd.period_range(end=config.SIM_END_MONTH, periods=config.MONTHS_OF_HISTORY, freq="M")
TRIGGER_DATE = _month_index[config.TRIGGER_MONTH_OFFSET].to_timestamp()


def run_trigger(trigger_type: str, language: str = config.DEFAULT_LANGUAGE) -> dict:
    user_id = config.TRIGGER_USER_MAP.get(trigger_type)
    if user_id is None:
        raise HTTPException(status_code=404, detail=f"Unknown trigger_type: {trigger_type}")

    before = compute_features(user_id, end_date=TRIGGER_DATE)
    after = compute_features(user_id, start_date=TRIGGER_DATE)
    reply = trigger_reaction(trigger_type, before, after, user_id, language=language)

    return {
        "trigger_type": trigger_type,
        "user_id": user_id,
        "trigger_date": TRIGGER_DATE.strftime("%Y-%m-%d"),
        "before": before,
        "after": after,
        "reply": reply,
    }
