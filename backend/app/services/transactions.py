"""Recent transaction history for the Accounts tab — thin read over the
already-loaded per-user transaction log, most recent first."""
from ..data_store import get_store


def get_recent_transactions(user_id: str, limit: int = 10) -> list[dict]:
    store = get_store()
    txns = store.get_transactions(user_id).sort_values("date", ascending=False).head(limit)
    return [
        {
            "date": row.date.strftime("%Y-%m-%d"),
            "category": row.category,
            "type": row.type,
            "amount": row.amount,
            "merchant": row.merchant,
            "channel": row.channel,
            "balance_after": row.balance_after,
        }
        for row in txns.itertuples()
    ]
