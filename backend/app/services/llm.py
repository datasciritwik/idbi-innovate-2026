"""Conversational layer: retrieve-then-reason over the user's own data.

Not fine-tuned, not general-knowledge chat — every reply is grounded in a
context block built from that specific user's profile, computed features,
portfolio snapshot, and recommendation. The system prompt instructs the model
to answer only from that context and say so when something isn't in it,
rather than inventing financial facts.
"""
import json

from anthropic import Anthropic
from fastapi import HTTPException

from .. import config
from ..data_store import get_store
from .allocation import generate_savings_plan
from .features import compute_features
from .portfolio import get_portfolio_snapshot

_client: Anthropic | None = None

SYSTEM_PROMPT = """You are Wren, a digital wealth concierge for a bank's mobile app.

You speak directly to one customer, using ONLY the CONTEXT block provided in
each message — their profile, spending features, portfolio snapshot, and
current recommendation. Never invent transactions, balances, or holdings
that aren't in the context. If something is genuinely not in the context,
say so plainly and offer to look deeper, rather than guessing.

Tone: warm, concise, confident, private-banking-advisor register — not
corporate boilerplate, not overly casual. Use ₹ for amounts. Keep replies to
2-4 sentences unless the question needs a breakdown.
"""


def _get_client() -> Anthropic:
    global _client
    if not config.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured on the server; conversational replies are unavailable.",
        )
    if _client is None:
        _client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


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


def _call(user_prompt: str) -> str:
    client = _get_client()
    response = client.messages.create(
        model=config.LLM_MODEL,
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()


def chat(user_id: str, message: str) -> str:
    context = build_context(user_id)
    prompt = f"CONTEXT:\n{json.dumps(context, default=str)}\n\nCUSTOMER QUESTION:\n{message}"
    return _call(prompt)


def trigger_reaction(trigger_type: str, before: dict, after: dict, user_id: str) -> str:
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
        "React to this life event as Wren, speaking directly to the customer. "
        "Acknowledge what changed (using the before/after numbers), then give one concrete, "
        "specific next step tied to their current recommendation."
    )
    return _call(prompt)
