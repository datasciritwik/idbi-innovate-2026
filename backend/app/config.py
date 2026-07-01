import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BACKEND_DIR / ".." / "data" / "output"))).resolve()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-5")

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

# Mirrors data/scripts/config.py — the demo dataset scripts a life event
# starting at month index 7 (2026-02) of the 12-month window ending 2026-06.
MONTHS_OF_HISTORY = 12
SIM_END_MONTH = "2026-06"
TRIGGER_MONTH_OFFSET = 7

# trigger_type -> demo user_id that carries that scripted event in the data
TRIGGER_USER_MAP = {
    "raise": "USR004",       # salary_bump
    "medical": "USR010",     # medical_expense
    "job_loss": "USR018",    # job_loss
}

# instrument_id -> asset class, for portfolio grouping/allocation display
INSTRUMENT_CATEGORY = {
    "EQ_SIP_01": "Equity",
    "EQ_SIP_02": "Equity",
    "DEBT_01": "Debt/FD",
    "DEBT_02": "Debt/FD",
    "ETF_01": "ETF",
    "ETF_02": "ETF",
    "BAL_01": "Hybrid",
}

# Target instrument-level weights per risk bucket for the allocation engine.
# Same shape as data/scripts/generate_users.py's demo-data weighting table —
# here it's the engine's live recommendation target, not just demo seeding.
RISK_TARGET_WEIGHTS = {
    "Conservative": {"EQ_SIP_01": 0.10, "EQ_SIP_02": 0.00, "DEBT_01": 0.45,
                      "DEBT_02": 0.25, "ETF_01": 0.05, "ETF_02": 0.10, "BAL_01": 0.05},
    "Moderate": {"EQ_SIP_01": 0.25, "EQ_SIP_02": 0.10, "DEBT_01": 0.20,
                  "DEBT_02": 0.15, "ETF_01": 0.15, "ETF_02": 0.05, "BAL_01": 0.10},
    "Aggressive": {"EQ_SIP_01": 0.30, "EQ_SIP_02": 0.30, "DEBT_01": 0.05,
                    "DEBT_02": 0.05, "ETF_01": 0.20, "ETF_02": 0.00, "BAL_01": 0.10},
}

# Fraction of monthly disposable surplus the engine proposes deploying into
# investments; the rest is left as liquid buffer.
DEPLOYMENT_FRACTION = 0.7

INCOME_CATEGORIES = {"Salary", "Freelance Income"}
EXCLUDED_FROM_EXPENSE = {"Salary", "Freelance Income", "Investment_SIP"}
