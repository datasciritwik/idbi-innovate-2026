# Vitta — Wealth Concierge (frontend)

React + TypeScript + Vite mobile-banking-app widget: a phone-frame UI wrapping a voice/text
avatar assistant ("Vitta") over a synthetic personalization dataset, plus a bottom tab bar
(Home / Accounts / Invest / Goals) showcasing that same per-user data the way a real bank app
would. Talks to the FastAPI backend in [`../backend`](../backend).

Live at **`https://vitta-app.pages.dev`** (Cloudflare Pages).

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_BASE_URL at a running backend
```

## Run

```bash
npm run dev
```

Requires the backend running locally (`../backend`, `uvicorn app.main:app --reload --port 8000`)
or `VITE_API_BASE_URL` pointed at the deployed instance.

## Build

```bash
npm run build     # tsc -b && vite build, output in dist/
npm run preview   # serve the production build locally
```

## Structure

- **`App.tsx`** — phone-frame shell: session bootstrap, active demo user, voice/text chat
  orchestration, and the tab bar (`activeTab: 'home' | 'accounts' | 'invest' | 'goals'`).
- **`components/`**
  - `Avatar`, `SpokenLine`, `InputBar`, `VoiceModeToggle`, `VoiceSettings` — the Home tab's
    voice/text conversation surface (mic capture via `@ricky0123/vad-web`, streamed TTS playback).
  - `PortfolioSnapshot`, `QuickActions` — Home tab supporting widgets.
  - `AccountsTab`, `InvestTab`, `GoalsTab` — the three banking-style tabs (recent transactions,
    holdings list, risk profile + recommendation), see
    [../docs/banking-tabs-frontend-spec.md](../docs/banking-tabs-frontend-spec.md) for the spec
    they were built against.
  - `TabBar` — bottom navigation between the four tabs.
  - `UserSwitcher` — dev/demo control for switching between the ~30 synthetic users.
  - `QuotaBadge` — shows remaining per-IP usage quota (backend has no login, so abuse
    prevention is a rolling-window quota per IP; see the backend README's Access control section).
- **`lib/`**
  - `api.ts` — typed fetch wrapper for every backend endpoint.
  - `session.ts` — anonymous session bootstrap/token caching + a small pub/sub so any component
    can subscribe to live quota updates (`subscribeToQuota`, `ensureQuotaKnown`).
  - `voice.ts`, `audio.ts`, `wavEncode.ts` — mic capture, VAD, and streamed audio playback helpers.

## Deployment

Static build deployed to Cloudflare Pages (no server-rendering, no Workers/Containers needed):

```bash
npm run build
npx wrangler pages project create vitta-app --production-branch main   # first time only
npx wrangler pages deploy dist --project-name vitta-app --commit-dirty=true
```

`VITE_API_BASE_URL` is baked in at build time — set it in `.env` before building. The deployed
backend's `ALLOWED_ORIGINS` must include the Pages origin (`https://vitta-app.pages.dev`) or
every API call will fail CORS.
