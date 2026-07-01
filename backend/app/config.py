import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BACKEND_DIR / ".." / "data" / "output"))).resolve()

# URL of the self-hosted conversational model endpoint (deployed separately;
# see llm.py). Empty until that deployment exists — chat/triggers return a
# graceful 503 in the meantime.
LLM_ENDPOINT_URL = os.getenv("LLM_ENDPOINT_URL", "")

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

# --- Anonymous session / access control (no user login exists yet) ---

# Signs the anonymous session JWT issued by POST /api/session. Must be set to
# a real secret at deploy time; the dev default is only for local use.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
SESSION_TOKEN_TTL_MINUTES = int(os.getenv("SESSION_TOKEN_TTL_MINUTES", "120"))

# Only trust the X-Forwarded-For header when running behind a known reverse
# proxy that sets it itself — otherwise a client could spoof it to dodge
# IP-based quota.
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"

# SQLite file backing the per-IP usage ledger. At deploy time this should
# point at a path on persistent storage so quota survives restarts.
QUOTA_DB_PATH = Path(os.getenv("QUOTA_DB_PATH", str(BACKEND_DIR / "data" / "quota.db"))).resolve()

# Anonymous, no-auth usage cap: each IP gets QUOTA_SECONDS of "talk time" per
# rolling QUOTA_WINDOW_HOURS window. There's no real per-turn audio duration
# yet (text chat only), so each chat/trigger turn is charged a flat estimate
# — replace CHAT_TURN_COST_SECONDS with the actual TTS clip length once
# speech turns exist.
QUOTA_SECONDS = int(os.getenv("QUOTA_SECONDS", str(10 * 60)))
QUOTA_WINDOW_HOURS = float(os.getenv("QUOTA_WINDOW_HOURS", "24"))
CHAT_TURN_COST_SECONDS = float(os.getenv("CHAT_TURN_COST_SECONDS", "20"))

# Concurrency gate in front of GPU-bound work (guards the self-hosted LLM/TTS
# endpoints, which only support a handful of concurrent calls). Requests
# beyond MAX_CONCURRENT_GPU_CALLS wait up to GPU_QUEUE_TIMEOUT_SECONDS before
# the caller is told to back off and retry.
MAX_CONCURRENT_GPU_CALLS = int(os.getenv("MAX_CONCURRENT_GPU_CALLS", "2"))
GPU_QUEUE_TIMEOUT_SECONDS = float(os.getenv("GPU_QUEUE_TIMEOUT_SECONDS", "8"))

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
