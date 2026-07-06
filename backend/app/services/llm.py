"""Conversational layer: retrieve-then-reason over the user's own data.

Not fine-tuned, not general-knowledge chat — every reply is grounded in a
context block built from that specific user's profile, computed features,
portfolio snapshot, and recommendation. The system prompt instructs the model
to answer only from that context and say so when something isn't in it,
rather than inventing financial facts.
"""
import json
import re

from fastapi import HTTPException

from . import modal_client
from .. import config
from ..data_store import get_store
from . import memory
from .allocation import generate_savings_plan
from .features import compute_features
from .portfolio import get_portfolio_snapshot

# Gemma occasionally prefixes its reply with a bare "thought" / "**Thought:**"
# / "<think>...</think>" reasoning header that leaks past skip_special_tokens.
# Strip it so it neither shows on screen nor gets spoken by TTS.
_LEADING_REASONING_RE = re.compile(
    r"^\s*(?:<think>.*?</think>|\**\s*(?:thought|thinking|reasoning|analysis)[\s:*]*)",
    re.IGNORECASE | re.DOTALL,
)


def _strip_reasoning_prefix(text: str) -> str:
    return _LEADING_REASONING_RE.sub("", text, count=1).lstrip()

SYSTEM_PROMPT = """You are Vitta, a digital wealth concierge for a bank's mobile app.

You speak directly to one customer, using ONLY the CONTEXT block provided in
each message — their profile, spending features, portfolio snapshot, and
current recommendation. Never invent transactions, balances, or holdings
that aren't in the context. If something is genuinely not in the context,
say so plainly and offer to look deeper, rather than guessing.

Tone: warm, concise, confident, private-banking-advisor register — not
corporate boilerplate, not overly casual. Use ₹ for amounts. Keep replies to
2-4 sentences unless the question needs a breakdown.
"""


def build_context(user_id: str, recent_txn_count: int = 10) -> dict:
    store = get_store()
    user = store.get_user(user_id)
    features = compute_features(user_id)
    snapshot = get_portfolio_snapshot(user_id)
    plan = generate_savings_plan(user_id)

    recent_txns = store.get_transactions(user_id).sort_values("date", ascending=False).head(recent_txn_count)
    recent_txns_list = [
        {
            "date": row.date.strftime("%Y-%m-%d"),
            "category": row.category,
            "type": row.type,
            "amount": row.amount,
        }
        for row in recent_txns.itertuples()
    ]

    return {
        "profile": {
            "name": user["name"],
            "age": user["age"],
            "city": user["city"],
            "occupation": user["occupation"],
            "monthly_income": user["monthly_income"],
            "risk_bucket": user["risk_bucket"],
            "financial_goals": user["financial_goals"],
            "dependents": user["dependents"],
        },
        "features": features,
        "portfolio": snapshot,
        "recommendation": plan,
        "recent_transactions": recent_txns_list,
    }


async def _call_full(user_prompt: str) -> str:
    """Awaits the model's full reply in one shot (no streaming) — the caller
    then splits into sentences and streams TTS synthesis, so end-users hear
    audio before the whole reply is done being spoken even though the text
    itself only lands once generation completes."""
    try:
        return await modal_client.call_cancellable(
            modal_client.llm().generate, SYSTEM_PROMPT, user_prompt
        )
    except modal_client.ModalUnavailable:
        raise HTTPException(
            status_code=503,
            detail="The conversational model isn't deployed on Modal yet; conversational replies are unavailable.",
        )


def _language_instruction(language: str) -> str:
    name = config.SUPPORTED_LANGUAGES.get(language, config.SUPPORTED_LANGUAGES[config.DEFAULT_LANGUAGE])
    if language == config.DEFAULT_LANGUAGE:
        return ""
    return f"\n\nRespond entirely in {name}, not English."


async def chat_full(user_id: str, message: str, session_id: str, language: str = config.DEFAULT_LANGUAGE) -> str:
    context = build_context(user_id)
    history = memory.get_recent_turns(session_id)
    history_block = (
        "\n".join(f"{turn['role'].upper()}: {turn['content']}" for turn in history) or "(no earlier turns)"
    )
    prompt = (
        f"CONTEXT:\n{json.dumps(context, default=str)}\n\n"
        f"CONVERSATION SO FAR:\n{history_block}\n\n"
        f"CUSTOMER QUESTION:\n{message}"
        f"{_language_instruction(language)}"
    )
    reply = _strip_reasoning_prefix((await _call_full(prompt)).strip())
    memory.record_turn(session_id, "customer", message)
    memory.record_turn(session_id, "vitta", reply)
    return reply


async def trigger_reaction_full(
    trigger_type: str, before: dict, after: dict, user_id: str, language: str = config.DEFAULT_LANGUAGE
) -> str:
    store = get_store()
    user = store.get_user(user_id)
    plan = generate_savings_plan(user_id)

    event_label = {
        "raise": "The customer just received a salary increase.",
        "medical": "The customer just incurred a large unexpected medical expense.",
        "job_loss": "The customer just lost their primary income source.",
    }.get(trigger_type, "The customer's financial situation just changed.")

    context = {
        "event": event_label,
        "profile": {
            "name": user["name"],
            "risk_bucket": user["risk_bucket"],
            "financial_goals": user["financial_goals"],
        },
        "features_before_event": before,
        "features_after_event": after,
        "current_recommendation": plan,
    }
    prompt = (
        f"CONTEXT:\n{json.dumps(context, default=str)}\n\n"
        "React to this life event as Vitta, speaking directly to the customer. "
        "Acknowledge what changed (using the before/after numbers), then give one concrete, "
        "specific next step tied to their current recommendation."
        f"{_language_instruction(language)}"
    )
    return _strip_reasoning_prefix((await _call_full(prompt)).strip())
