# Synthetic Data Layer

Generates the demo dataset consumed by the personalization engine: investment universe,
user profiles, and transaction/UPI logs for 30 interconnected demo users.

## Setup

```bash
cd data
uv venv
uv pip install -r requirements.txt
```

## Generate

```bash
cd scripts
source ../.venv/bin/activate
python generate_all.py
```

Outputs land in `data/output/`:

- `instruments.json` — 7-instrument mock universe (2 equity SIPs, 2 debt/FD, 2 ETFs, 1 hybrid)
- `instrument_nav_history.csv` — 12-month synthetic NAV series per instrument (GBM-style for equity/ETF, near-flat for debt/FD)
- `users.json` — 30 user profiles with rule-based risk scoring (age/income/dependents/experience → risk bucket), goals, and existing holdings
- `transactions.csv` — ~9,900 UPI/bank transactions (12 months x 30 users): salary, rent/EMI, SIP debits, everyday spend categories

## Life-event triggers (for live demo)

Three users carry a scripted event starting month 8 of the 12-month window (`config.py: LIFE_EVENT_USERS`):

| user_id | event | effect |
|---|---|---|
| USR004 | `salary_bump` | salary jumps ~22% |
| USR010 | `medical_expense` | one-time large medical debit (~3x monthly income) |
| USR018 | `job_loss` | salary stops, replaced by sparse freelance income |

Use these to demo the personalization engine reacting to a changed financial situation.

## Regenerating

All generation is seeded (`config.py: SEED = 42`) for reproducibility. Re-running `generate_all.py`
overwrites `data/output/` deterministically.
