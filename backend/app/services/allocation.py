"""Risk-matched allocation + savings plan generator.

Surplus detection (features.py) feeds this: given a user's disposable monthly
cash and their risk bucket, propose how to close the gap between their
current instrument-level weights and the target weights for their risk
profile, subject to each instrument's minimum investment.
"""
from .. import config
from ..data_store import get_store
from .features import compute_features
from .portfolio import get_portfolio_snapshot


def generate_savings_plan(user_id: str) -> dict:
    store = get_store()
    user = store.get_user(user_id)
    risk_bucket = user["risk_bucket"]
    target_weights = config.RISK_TARGET_WEIGHTS[risk_bucket]

    snapshot = get_portfolio_snapshot(user_id)
    total_value = snapshot["total_value"]
    holdings = {h["instrument_id"]: h["value"] for h in snapshot["holdings"]}

    current_weights = {
        inst: (holdings.get(inst, 0.0) / total_value if total_value else 0.0)
        for inst in target_weights
    }
    gaps = {inst: max(0.0, target_weights[inst] - current_weights[inst]) for inst in target_weights}
    gap_sum = sum(gaps.values())
    if gap_sum == 0:
        gaps = {inst: w for inst, w in target_weights.items()}
        gap_sum = sum(gaps.values())

    features = compute_features(user_id)
    disposable = max(0.0, features["disposable_after_sip"])
    deployable = round(disposable * config.DEPLOYMENT_FRACTION, 2)

    raw_allocations = {inst: deployable * (gap / gap_sum) for inst, gap in gaps.items() if gap > 0}

    # Drop allocations below an instrument's minimum investment, redistribute once.
    funded = {}
    dropped_total = 0.0
    for inst, amount in raw_allocations.items():
        min_inv = store.get_instrument(inst)["min_investment"]
        if amount < min_inv:
            dropped_total += amount
        else:
            funded[inst] = amount

    if dropped_total > 0 and funded:
        funded_gap_sum = sum(gaps[inst] for inst in funded)
        for inst in funded:
            funded[inst] += dropped_total * (gaps[inst] / funded_gap_sum)

    recommended_allocations = [
        {
            "instrument_id": inst,
            "name": store.get_instrument(inst)["name"],
            "type": store.get_instrument(inst)["type"],
            "monthly_amount": round(amount, 2),
            "rationale": (
                f"Currently {round(current_weights[inst] * 100, 1)}% of your portfolio vs. a "
                f"{round(target_weights[inst] * 100, 1)}% target for a {risk_bucket} profile."
            ),
        }
        for inst, amount in sorted(funded.items(), key=lambda kv: kv[1], reverse=True)
    ]

    allocated_total = round(sum(a["monthly_amount"] for a in recommended_allocations), 2)
    liquid_buffer = round(disposable - allocated_total, 2)

    return {
        "user_id": user_id,
        "risk_bucket": risk_bucket,
        "monthly_disposable_surplus": disposable,
        "monthly_deployable": deployable,
        "recommended_allocations": recommended_allocations,
        "liquid_buffer": liquid_buffer,
        "features": features,
    }
