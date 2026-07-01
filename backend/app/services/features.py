"""Feature extraction: surplus detection, cashflow trend, top spend categories.

Operates on a user's raw transaction log. Callers can pass a start/end date
window (used by the life-event trigger comparison) or leave it open to cover
the full 12-month history.
"""
import pandas as pd

from .. import config
from ..data_store import get_store


def _monthly_aggregates(txns: pd.DataFrame):
    df = txns.copy()
    df["month"] = df["date"].dt.to_period("M")

    income = df[df.category.isin(config.INCOME_CATEGORIES)]
    sip = df[df.category == "Investment_SIP"]
    expense = df[~df.category.isin(config.EXCLUDED_FROM_EXPENSE)]

    income_by_month = income.groupby("month")["amount"].sum()
    sip_by_month = sip.groupby("month")["amount"].sum()
    expense_by_month = expense.groupby("month")["amount"].sum()

    return income_by_month, expense_by_month, sip_by_month


def compute_features(user_id: str, start_date=None, end_date=None) -> dict:
    store = get_store()
    txns = store.get_transactions(user_id)

    if start_date is not None:
        txns = txns[txns.date >= pd.Timestamp(start_date)]
    if end_date is not None:
        txns = txns[txns.date < pd.Timestamp(end_date)]

    if txns.empty:
        return {
            "monthly_income_avg": 0.0,
            "monthly_expense_avg": 0.0,
            "monthly_sip_avg": 0.0,
            "surplus_before_sip": 0.0,
            "disposable_after_sip": 0.0,
            "cashflow_trend": "unknown",
            "top_spend_categories": [],
            "months_covered": 0,
        }

    income_by_month, expense_by_month, sip_by_month = _monthly_aggregates(txns)

    income_avg = round(income_by_month.mean(), 2) if not income_by_month.empty else 0.0
    expense_avg = round(expense_by_month.mean(), 2) if not expense_by_month.empty else 0.0
    sip_avg = round(sip_by_month.mean(), 2) if not sip_by_month.empty else 0.0

    surplus_before_sip = round(income_avg - expense_avg, 2)
    disposable_after_sip = round(surplus_before_sip - sip_avg, 2)

    net_by_month = income_by_month.reindex(expense_by_month.index.union(income_by_month.index), fill_value=0) \
        - expense_by_month.reindex(expense_by_month.index.union(income_by_month.index), fill_value=0)
    net_by_month = net_by_month.sort_index()

    cashflow_trend = "unknown"
    if len(net_by_month) >= 2:
        half = max(1, len(net_by_month) // 2)
        earlier = net_by_month.iloc[:-half].mean() if len(net_by_month) > half else net_by_month.iloc[:1].mean()
        later = net_by_month.iloc[-half:].mean()
        if earlier == 0:
            cashflow_trend = "stable"
        else:
            pct_change = (later - earlier) / abs(earlier)
            if pct_change > 0.05:
                cashflow_trend = "improving"
            elif pct_change < -0.05:
                cashflow_trend = "declining"
            else:
                cashflow_trend = "stable"

    expense_df = txns[~txns.category.isin(config.EXCLUDED_FROM_EXPENSE)]
    months_covered = expense_df["date"].dt.to_period("M").nunique() or 1
    top_categories = (
        expense_df.groupby("category")["amount"].sum().div(months_covered).sort_values(ascending=False).head(3)
    )
    top_spend_categories = [
        {"category": cat, "monthly_avg": round(val, 2)} for cat, val in top_categories.items()
    ]

    return {
        "monthly_income_avg": income_avg,
        "monthly_expense_avg": expense_avg,
        "monthly_sip_avg": sip_avg,
        "surplus_before_sip": surplus_before_sip,
        "disposable_after_sip": disposable_after_sip,
        "cashflow_trend": cashflow_trend,
        "top_spend_categories": top_spend_categories,
        "months_covered": int(months_covered),
    }
