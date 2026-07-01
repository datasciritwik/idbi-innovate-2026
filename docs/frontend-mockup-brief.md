# Frontend Mockup — Build Brief

Dummy/mockup only. No API calls, no real data — everything is hardcoded inline. Goal: nail the
look/feel of the avatar-based wealth concierge before wiring up the backend (Day 7 of the plan).

> **Revision (post-v1 review):** the first build (Avatar + PortfolioSnapshot + scrollable
> ChatThread + QuickActions + InputBar, all stacked) read as "chat app with a small avatar icon,"
> not an avatar-based interface. Confirmed direction: **true voice-assistant style** — no message
> history/log at all. Just the orb, Wren's *current* spoken line (replaces the previous one, not
> appended), and quick-action pills. See "Revised layout" section below — it supersedes the
> original Component Breakdown and Spatial Composition sections for anything they conflict on.

## Already scaffolded (in `frontend/`)

- Vite + React + TypeScript (`npm create vite@latest . -- --template react-ts`)
- Tailwind v4 via `@tailwindcss/vite` (installed, wired into `vite.config.ts`)
- `motion` (Framer Motion successor) installed for animation
- Fonts linked in `index.html` — see Typography below
- `src/index.css` is still the default Vite starter CSS — replace it, don't extend it

## Aesthetic direction: "Private Banking Concierge"

Not a generic fintech app. Think private-bank-at-midnight: ink navy, warm gold, quiet confidence.
Avoid: purple gradients, Inter/Roboto/system-ui, glassy generic SaaS look.

- **Tone**: refined, calm, premium. Restraint over decoration.
- **The one memorable thing**: the avatar is a glowing breathing orb (not a cartoon face/3D
  avatar) — a soft radial-gradient sphere with a slow pulse animation, sitting in a dark stage.
  It reads as "presence," not "chatbot icon," and costs zero asset production.

### Color palette

```css
--ink:        #0b0f1a;   /* page/stage background */
--ink-raised: #131826;   /* card surfaces */
--ink-border: #232a3d;   /* hairline borders on dark */
--gold:       #d4af6a;   /* primary accent — CTAs, active states, avatar glow */
--gold-soft:  #d4af6a1a; /* 10% gold, for subtle fills/backgrounds */
--sage:       #8fae9c;   /* secondary accent — positive deltas, calm signals */
--paper:      #f4efe6;   /* primary text on dark (warm off-white, not pure white) */
--paper-dim:  #a8a3ab;   /* secondary/muted text */
--danger:     #c96a5a;   /* negative deltas, alerts — muted terracotta, not stock-market red */
```

Dark theme throughout — this is the whole point of the "midnight private bank" feel. Don't add a
light mode for the mockup.

### Typography

- **Display** (headings, avatar name, big numbers): `Fraunces` — variable serif, use optical size
  axis if possible (`font-optical-sizing: auto`). Weight 300–500 for elegance, occasional italic
  for the avatar's spoken lines.
- **Body** (chat text, labels, UI copy): `Public Sans` — 400/500/600.
- **Numerals** (₹ amounts, percentages, dates in data): `JetBrains Mono` with `font-variant-numeric:
  tabular-nums` — gives the ledger/statement feel and keeps columns aligned.

All three are already linked via Google Fonts in `index.html`.

### Motion principles

- One orchestrated load: stagger the widget's sections in on mount (avatar → portfolio card →
  chat thread → quick actions → input bar), ~60–80ms delay between each, via `motion`'s
  `staggerChildren`.
- Avatar: continuous slow breathing pulse (scale 1 → 1.03, opacity glow shift, ~4s ease-in-out
  loop) — this is the signature detail, spend the most polish here.
- Chat bubbles: slide up + fade in as they "arrive," assistant bubbles slightly delayed vs. user
  bubbles to feel like a response.
- Quick-action pills: subtle hover lift + gold border glow on hover/focus.
- Keep everything else static — don't scatter micro-interactions everywhere, it dilutes the one
  big moment.

### Spatial composition

- Render as a **mobile widget frame**, not a full desktop page: ~390×844 card centered on the
  `--ink` stage, rounded corners (~28px), subtle outer shadow, like it's floating inside a banking
  app screen. This directly serves the plan's "mobile-app-style embeddable widget" requirement.
- Inside the frame: avatar zone up top with generous negative space around the orb, then content
  gets denser going down (portfolio card, chat, actions, input) — density increases as you scroll
  down, mirroring how a real chat screen works.
- Portfolio snapshot card: break the grid slightly — a thin diagonal gold accent stripe across one
  corner, not a plain rectangle.
- Background texture on the stage (outside the widget frame): faint grain/noise overlay + a soft
  radial gradient mesh in ink/gold, very low opacity — gives depth without being busy.

## Component breakdown (suggested structure)

```
frontend/src/
  index.css              — theme variables, base resets, font-face fallbacks
  App.tsx                 — stage + widget frame shell
  components/
    Avatar.tsx             — the glowing orb, breathing animation, avatar name + status line
    PortfolioSnapshot.tsx  — total value, today's change (₹ + %), 3–4 allocation bars
    ChatThread.tsx         — scrollable message list
    ChatBubble.tsx         — single message (user | assistant variant)
    QuickActions.tsx       — pill buttons for scripted demo triggers
    InputBar.tsx           — text input + send button (non-functional, just UI)
```

## Hardcoded mock content to use

Use these so the mockup already tells the "personalized wealth concierge" story without any
backend:

**Avatar identity**: name it "Wren" (short, warm, non-corporate). Status line under the name:
"Reviewing your portfolio" / "Here whenever you need me."

**Portfolio snapshot**:
- Total value: ₹8,42,600
- Today's change: +₹3,240 (+0.38%) in `--sage`
- Allocation bars: Equity 45%, Debt/FD 30%, ETF 15%, Hybrid 10%

**Chat transcript** (3–4 exchanges, most recent at bottom):
- User: "Can I afford a bike worth ₹1.2L right now?"
- Wren: "Yes — after this month's essentials you'll have about ₹34,000 in surplus. A ₹1.2L
  purchase would dip into your emergency fund by ~15%. I'd suggest a 3-month SIP pause instead of
  a lump sum, if you want to keep the fund intact."
- User: "Why did my portfolio drop yesterday?"
- Wren: "Your Emerging Opportunities Fund pulled back about 1.8% — broad mid-cap movement, nothing
  specific to your holdings. Your Debt and Gold ETF positions held steady, which is exactly what
  they're there for."

**Quick action pills** (these map to the plan's "hardcoded life-event triggers"):
- "Got a raise 🎉"
- "Unexpected medical expense"
- "Can I afford this?"

## Revised layout: avatar-first, no chat log

The orb is no longer a badge sitting above the "real" content — it **is** the interface. Nothing
else on screen should out-compete it for visual weight.

### Structure

```
┌─────────────────────────┐
│                         │
│     [ BIG ORB ]         │  ← ~40–45% of frame height, centered
│        Wren             │
│                         │
│  "Yes — after this      │  ← Wren's current spoken line, sits directly
│   month's essentials    │    under/around the orb (same visual unit,
│   you'll have ~₹34,000  │    not a separate card below it). Replaces
│   in surplus..."        │    in place when a new response arrives —
│                         │    no scrollback, no bubbles, no history.
├─────────────────────────┤
│ ₹8,42,600  +0.38%       │  ← portfolio shrinks to a single compact
├─────────────────────────┤     strip: total + delta only. Allocation
│ [raise] [medical] [?]   │     bars move behind a tap/expand, not default.
├─────────────────────────┤
│ Ask Wren about your...  │  ← input stays, but it's the mechanism that
└─────────────────────────┘     produces the next spoken line, not a
                                 chat log entry.
```

### What changes vs. the original build

- **Delete `ChatThread.tsx` and `ChatBubble.tsx`** — no history, no scrolling message list.
- **New `SpokenLine.tsx`** (replaces them): renders exactly one message at a time — Wren's most
  recent line. On update, animate the old line out / new line in (fade + slight y-shift, ~300ms)
  rather than appending. The user's own question does *not* need to render as a separate bubble —
  optionally flash it briefly (e.g. as a dimmed line above Wren's answer that fades after ~1.5s)
  purely to confirm what was heard, then it's gone.
- **`Avatar.tsx` grows significantly** — target ~150–180px orb (up from 56px core), taking the
  dominant share of the frame. `SpokenLine` should visually feel attached to it (same card/glow
  radius or immediately adjacent), not a separate section.
- **`PortfolioSnapshot.tsx` shrinks to a single strip** — total value + today's delta only.
  Allocation breakdown becomes an expandable/tappable detail, not shown by default.
- **`QuickActions.tsx` and `InputBar.tsx` stay**, but note the bug from the current build: pills
  were clipped at the left edge in the screenshot — check the container isn't clipping overflow,
  and that pills wrap or scroll horizontally cleanly.
- Interaction model end to end: user taps a pill or types in the input → orb enters its
  "processing" pulse state (already built, keep it) → `SpokenLine` swaps to Wren's new response →
  orb returns to idle breathing.

### Mock content adjustment

Since there's no scrollback, you don't need the 4-message transcript from the original brief —
just need one "current" line per interaction, matching whatever pill/input triggered it. Reuse the
existing hardcoded responses per action (`raise`, `medical`, `afford`, custom) — that logic in
`App.tsx` mostly holds, it's just what renders that changes (single `SpokenLine`, not an appended
`messages` array).

## What NOT to build yet

- No real input handling / send logic — pressing send can just no-op or append a canned reply.
- No routing, no auth, no API client.
- No light/dark toggle.
- Don't wire this to `data/output/` — those files are gitignored and only get consumed by the
  backend at deploy time (see [data/README.md](../data/README.md)).
