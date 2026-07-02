# Personalization Engine + Conversational Layer

FastAPI backend that both the frontend and any future mobile integration call into. Two layers:

1. **Personalization engine** — surplus detection, risk-matched allocation, savings plan
   generation, portfolio snapshotting, and transaction history. Pure computation over the
   synthetic dataset, no LLM.
2. **Conversational layer** — retrieval-then-reason over that same computed context, via a
   self-hosted model endpoint (`LLM_ENDPOINT_URL`). No fine-tuning, no general-knowledge chat:
   every reply is grounded in a JSON context block built from the specific user's
   profile/features/portfolio/recommendation.

Live at **`https://wren-api.fastapicloud.dev`** (deployed on [FastAPI Cloud](https://fastapicloud.com)
— the deployment identifier itself is called `wren-api` and is left as-is even after the app
was renamed to **Vitta**, see [Deployment](#deployment) below).

## Setup

```bash
cd backend
uv venv
uv pip install -r requirements.txt
cp .env.example .env   # then fill in LLM_ENDPOINT_URL once the model endpoint is deployed
```

Requires the synthetic dataset to already exist at `../data/output/` (run
`data/scripts/generate_all.py` first if it doesn't — see [data/README.md](../data/README.md)).
That dataset is gitignored; at deploy time, bake the same four files in and point `DATA_DIR` at
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
| GET | `/api/languages` | supported reply languages |
| GET | `/api/session` | issue/refresh the anonymous session JWT + report remaining quota |
| GET | `/api/users` | list demo users (id, name, city, risk bucket) |
| GET | `/api/users/{user_id}` | full profile + computed features (surplus, cashflow trend, top spend) |
| GET | `/api/users/{user_id}/portfolio` | total value, latest-month change, allocation by asset class, and per-holding detail (name/type/risk_level) |
| GET | `/api/users/{user_id}/transactions?limit=10` | most recent transactions, newest first |
| GET | `/api/users/{user_id}/recommendation` | risk-matched allocation gap + monthly savings plan |
| POST | `/api/users/{user_id}/chat` | `{"message": "..."}` → Vitta's grounded reply (streamed) |
| GET | `/api/triggers` | list the 3 scripted life-event triggers and which demo user carries each |
| POST | `/api/triggers/{trigger_type}` | `raise` \| `medical` \| `job_loss` → before/after feature diff + Vitta's reaction |

Every endpoint except `/health` and `/api/languages` requires the anonymous session Bearer token
from `/api/session`. `/chat` and `/triggers/*` additionally cost quota and pass through the GPU
concurrency gate (see [Access control](#access-control-no-login-required)); the rest are free reads.

Without `LLM_ENDPOINT_URL` set, `/chat` and `/triggers/*` return `503` rather than crashing —
everything else works standalone for local frontend development.

## Access control (no login required)

There's no user login — anyone can open the app — so abuse prevention happens per-IP instead:

- **Anonymous session**: `/api/session` issues a short-lived JWT (`SESSION_TOKEN_TTL_MINUTES`,
  default 120 min). Every other endpoint requires it via `require_session` (`app/security/deps.py`).
- **Per-IP quota**: each IP gets `QUOTA_SECONDS` of chat "talk time" per rolling
  `QUOTA_WINDOW_HOURS` window, tracked in a small SQLite ledger (`QUOTA_DB_PATH`).
  `CHAT_TURN_COST_SECONDS` is charged per `/chat` or `/triggers/*` call as a stand-in until turns
  have a real audio duration. Remaining quota is returned via the `X-Quota-Remaining-Seconds`
  response header and surfaced in the UI (`QuotaBadge`).
- **Client IP resolution** (`get_client_ip`): prefers the `cf-connecting-ip` header (set by
  Cloudflare's edge, unspoofable) over the generic `x-forwarded-for`, and only when
  `TRUST_PROXY_HEADERS=true` — otherwise falls back to the raw socket peer address.
- **GPU concurrency gate**: at most `MAX_CONCURRENT_GPU_CALLS` requests hit the self-hosted
  LLM/TTS endpoints at once; anything beyond that waits up to `GPU_QUEUE_TIMEOUT_SECONDS` before
  getting a `503` asking the client to retry.

Content moderation/guardrails on the LLM's own outputs is explicitly out of scope for now.

## Deployment

Deployed on [FastAPI Cloud](https://fastapicloud.com) (a Cloudflare Containers deploy was
attempted first but requires a paid Workers plan, so this project uses FastAPI Cloud instead).
A few things specific to that target:

- `pyproject.toml` pins `requires-python = ">=3.12,<3.13"` — leaving it open-ended lets FastAPI
  Cloud pick its newest default Python, which has no prebuilt wheels for the pinned
  pandas/numpy versions and no C++ toolchain to build them from source.
- `.fastapicloudignore` negates the root `.gitignore`'s exclusion of `data/output/` (via
  `!data/output/` / `!data/output/**`) so the baked-in dataset copy at `backend/data/output/`
  actually gets uploaded — a plain `.gitignore` exclusion elsewhere in the tree is otherwise
  honored by the uploader too.
- Env vars (including `JWT_SECRET` as an encrypted secret) are set via
  `fastapi cloud env set NAME VALUE [--secret]` and only take effect after the next
  `fastapi deploy` — they are not live-reloaded into a running deployment.
- `ALLOWED_ORIGINS` currently includes the deployed frontend
  (`https://vitta-app.pages.dev`, on Cloudflare Pages) plus `http://localhost:5173` for local dev.

## Design notes

- **Surplus detection** (`services/features.py`): monthly income/expense/SIP averages from the raw
  transaction log, a cashflow trend label (improving/stable/declining) from a first-half vs.
  second-half comparison, and top spend categories.
- **Allocation** (`services/allocation.py`): target instrument weights per risk bucket (see
  `config.RISK_TARGET_WEIGHTS`), gapped against current holdings, funded from 70% of disposable
  surplus, with a redistribution pass for allocations that fall below an instrument's minimum
  investment.
- **Portfolio & transactions** (`services/portfolio.py`, `services/transactions.py`): thin reads
  over the same loaded dataset — portfolio snapshotting adds latest-month return per holding and
  category-level allocation weights; transactions is just the per-user log sorted newest-first.
- **Life-event triggers** (`services/triggers.py`): the *event* is scripted in the data (3 demo
  users each carry one baked-in event starting 2026-02 — see
  `data/scripts/generate_transactions.py`), but the before/after feature comparison and Vitta's
  reaction text are computed live, not hardcoded strings. This is what the plan's "hardcoded
  life-event triggers to demo adaptability live" means in practice.
- **RAG**: with ~30 demo users and a year of transactions, a vector store would be overkill —
  `llm.build_context()` just assembles the relevant computed context directly per request. Worth
  revisiting only if the dataset or per-user history grows well past demo scale.
