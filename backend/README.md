# Personalization Engine + Conversational Layer

FastAPI backend that both the frontend and any future mobile integration call into. Two layers:

1. **Personalization engine** — surplus detection, risk-matched allocation, savings plan
   generation, and portfolio snapshotting. Pure computation over the synthetic dataset, no LLM.
2. **Conversational layer** — retrieval-then-reason over that same computed context, via a
   self-hosted model endpoint (`LLM_ENDPOINT_URL`). No fine-tuning, no general-knowledge chat:
   every reply is grounded in a JSON context block built from the specific user's
   profile/features/portfolio/recommendation.

## Setup

```bash
cd backend
uv venv
uv pip install -r requirements.txt
cp .env.example .env   # then fill in LLM_ENDPOINT_URL once the model endpoint is deployed
```

Requires the synthetic dataset to already exist at `../data/output/` (run
`data/scripts/generate_all.py` first if it doesn't — see [data/README.md](../data/README.md)).
That dataset is gitignored; at deploy time, bake the same three files in and point `DATA_DIR` at
wherever they land instead of the local sibling path.

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness check |
| GET | `/api/users` | list demo users (id, name, city, risk bucket) |
| GET | `/api/users/{user_id}` | full profile + computed features (surplus, cashflow trend, top spend) |
| GET | `/api/users/{user_id}/portfolio` | total value, latest-month change, allocation by asset class |
| GET | `/api/users/{user_id}/recommendation` | risk-matched allocation gap + monthly savings plan |
| POST | `/api/users/{user_id}/chat` | `{"message": "..."}` → Wren's grounded reply |
| GET | `/api/triggers` | list the 3 scripted life-event triggers and which demo user carries each |
| POST | `/api/triggers/{trigger_type}` | `raise` \| `medical` \| `job_loss` → before/after feature diff + Wren's reaction |

Without `LLM_ENDPOINT_URL` set, `/chat` and `/triggers/*` return `503` rather than crashing —
everything else works standalone for local frontend development.

## Design notes

- **Surplus detection** (`services/features.py`): monthly income/expense/SIP averages from the raw
  transaction log, a cashflow trend label (improving/stable/declining) from a first-half vs.
  second-half comparison, and top spend categories.
- **Allocation** (`services/allocation.py`): target instrument weights per risk bucket (see
  `config.RISK_TARGET_WEIGHTS`), gapped against current holdings, funded from 70% of disposable
  surplus, with a redistribution pass for allocations that fall below an instrument's minimum
  investment.
- **Life-event triggers** (`services/triggers.py`): the *event* is scripted in the data (3 demo
  users each carry one baked-in event starting 2026-02 — see
  `data/scripts/generate_transactions.py`), but the before/after feature comparison and Wren's
  reaction text are computed live, not hardcoded strings. This is what the plan's "hardcoded
  life-event triggers to demo adaptability live" means in practice.
- **RAG**: with ~30 demo users and a year of transactions, a vector store would be overkill —
  `llm.build_context()` just assembles the relevant computed context directly per request. Worth
  revisiting only if the dataset or per-user history grows well past demo scale.
