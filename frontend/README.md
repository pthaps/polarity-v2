# Polarity — frontend (Next.js 14)

Next.js App Router app: **URL or pasted text** → `POST /api/fetch-news` (when URL) → `POST /api/analyze` → dashboard (bias spectrum, credibility, agent cards, claims, summary).

**Also exposes:** `POST /api/feedback`, `GET|POST /api/traction`, `POST /api/extension-analyze` (lighter path for quick checks).

**Extension handoff:** When opened from the Chrome extension, the app may read **`sessionStorage.polarity-hydrate`** (JSON from a completed analyze) to show the full result **without calling analyze again** — see root [`docs/MASTER_PLAN.md`](../docs/MASTER_PLAN.md).

## Commands

From **repo root:** `npm run dev` (if wired) or:

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

**Deploy:** Vercel **Root Directory** = `frontend`.

**Env:** Copy `.env.example` → `.env.local`. `GEMINI_API_KEY` is required for analysis.
