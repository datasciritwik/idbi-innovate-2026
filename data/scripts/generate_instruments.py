"""Generate a mock investment universe: instrument metadata + synthetic NAV history.

Equity/ETF NAVs follow geometric Brownian motion (drift + volatility).
Debt/FD instruments follow a near-flat compounding curve with tiny noise.
"""
import json
import numpy as np
import pandas as pd

from config import SEED, MONTHS_OF_HISTORY, SIM_END_MONTH

INSTRUMENTS = [
    {
        "instrument_id": "EQ_SIP_01",
        "name": "BlueChip Growth Equity Fund",
        "type": "Equity SIP",
        "risk_level": "High",
        "expected_annual_return": 0.13,
        "annual_volatility": 0.18,
        "min_investment": 500,
        "lock_in_period_years": 0,
        "description": "Large-cap diversified equity fund for long-term wealth growth.",
    },
    {
        "instrument_id": "EQ_SIP_02",
        "name": "Emerging Opportunities Fund",
        "type": "Equity SIP",
        "risk_level": "Very High",
        "expected_annual_return": 0.16,
        "annual_volatility": 0.26,
        "min_investment": 500,
        "lock_in_period_years": 0,
        "description": "Mid/small-cap fund targeting higher growth with higher volatility.",
    },
    {
        "instrument_id": "DEBT_01",
        "name": "IDBI Fixed Deposit (3yr)",
        "type": "Debt/FD",
        "risk_level": "Low",
        "expected_annual_return": 0.071,
        "annual_volatility": 0.002,
        "min_investment": 1000,
        "lock_in_period_years": 3,
        "description": "Bank fixed deposit with guaranteed returns, 3-year tenure.",
    },
    {
        "instrument_id": "DEBT_02",
        "name": "Corporate Bond Fund",
        "type": "Debt/FD",
        "risk_level": "Low-Medium",
        "expected_annual_return": 0.078,
        "annual_volatility": 0.015,
        "min_investment": 1000,
        "lock_in_period_years": 0,
        "description": "Short-duration corporate debt fund for stable, moderate returns.",
    },
    {
        "instrument_id": "ETF_01",
        "name": "Nifty 50 Index ETF",
        "type": "ETF",
        "risk_level": "Medium-High",
        "expected_annual_return": 0.12,
        "annual_volatility": 0.16,
        "min_investment": 100,
        "lock_in_period_years": 0,
        "description": "Passive index-tracking ETF mirroring Nifty 50.",
    },
    {
        "instrument_id": "ETF_02",
        "name": "Gold ETF",
        "type": "ETF",
        "risk_level": "Medium",
        "expected_annual_return": 0.09,
        "annual_volatility": 0.13,
        "min_investment": 100,
        "lock_in_period_years": 0,
        "description": "Gold-backed ETF, used as a portfolio hedge/diversifier.",
    },
    {
        "instrument_id": "BAL_01",
        "name": "Balanced Advantage Fund",
        "type": "Hybrid",
        "risk_level": "Medium",
        "expected_annual_return": 0.105,
        "annual_volatility": 0.09,
        "min_investment": 500,
        "lock_in_period_years": 0,
        "description": "Dynamically allocates between equity and debt based on market valuation.",
    },
]


def generate_nav_series(rng, expected_annual_return, annual_volatility, months, start_nav=100.0):
    monthly_drift = expected_annual_return / 12
    monthly_vol = annual_volatility / np.sqrt(12)
    monthly_returns = rng.normal(loc=monthly_drift, scale=monthly_vol, size=months)
    nav = [start_nav]
    for r in monthly_returns:
        nav.append(nav[-1] * (1 + r))
    return nav[1:]


def main():
    rng = np.random.default_rng(SEED)
    month_index = pd.period_range(end=SIM_END_MONTH, periods=MONTHS_OF_HISTORY, freq="M")

    nav_rows = []
    for inst in INSTRUMENTS:
        nav_series = generate_nav_series(
            rng, inst["expected_annual_return"], inst["annual_volatility"], MONTHS_OF_HISTORY
        )
        for month, nav in zip(month_index, nav_series):
            nav_rows.append({
                "instrument_id": inst["instrument_id"],
                "month": str(month),
                "nav": round(nav, 4),
            })

    with open("../output/instruments.json", "w") as f:
        json.dump(INSTRUMENTS, f, indent=2)

    nav_df = pd.DataFrame(nav_rows)
    nav_df.to_csv("../output/instrument_nav_history.csv", index=False)

    print(f"Generated {len(INSTRUMENTS)} instruments, {len(nav_df)} NAV rows.")


if __name__ == "__main__":
    main()
