"""Portfolio snapshot: current value, latest-month movement, allocation by asset class."""
from .. import config
from ..data_store import get_store


def get_portfolio_snapshot(user_id: str) -> dict:
    store = get_store()
    user = store.get_user(user_id)
    holdings = user["existing_holdings"]

    total_value = round(sum(holdings.values()), 2)

    change_amount = 0.0
    for instrument_id, value in holdings.items():
        prev_nav, latest_nav = store.latest_two_navs(instrument_id)
        if prev_nav is None or prev_nav == 0:
            continue
        instrument_return = (latest_nav - prev_nav) / prev_nav
        change_amount += value * instrument_return

    change_pct = round((change_amount / total_value) * 100, 2) if total_value else 0.0

    category_totals: dict[str, float] = {}
    for instrument_id, value in holdings.items():
        category = config.INSTRUMENT_CATEGORY.get(instrument_id, "Other")
        category_totals[category] = category_totals.get(category, 0.0) + value

    allocation = [
        {
            "category": category,
            "value": round(value, 2),
            "weight_pct": round((value / total_value) * 100, 1) if total_value else 0.0,
        }
        for category, value in sorted(category_totals.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return {
        "user_id": user_id,
        "total_value": total_value,
        "change_amount": round(change_amount, 2),
        "change_pct": change_pct,
        "allocation": allocation,
        "holdings": [_holding_detail(store, iid, v) for iid, v in holdings.items()],
    }


def _holding_detail(store, instrument_id: str, value: float) -> dict:
    instrument = store.get_instrument(instrument_id)
    return {
        "instrument_id": instrument_id,
        "value": round(value, 2),
        "name": instrument["name"] if instrument else instrument_id,
        "type": instrument["type"] if instrument else None,
        "risk_level": instrument["risk_level"] if instrument else None,
    }
