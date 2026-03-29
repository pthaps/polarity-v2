# Polarity AI

**Article-level media bias and credibility analysis** — paste a news URL or article text, get blended AI + Ad Fontes scores, multi-agent commentary, claim-level fact-check blocks, and optional live source URLs (Tavily).

Upstream layout: **[pthaps/polarity-v2](https://github.com/pthaps/polarity-v2)** — monorepo with **`frontend/`**, **`backend/`** (placeholder), **`extension/`**, **`docs/`**.

📄 **Hackathon master plan (vision, stack, risks, differentiation):** [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md)

---

## What’s in the box (this repo)

| Area | Description |
|------|-------------|
| **Web app** | Next.js 14 UI + API routes: `analyze`, `fetch-news`, `feedback`, `traction`, `extension-analyze` |
| **Analysis** | 3 Gemini agents in parallel (bias, fact-check, synthesizer) → 1 synthesis pass for scores + summary; **55% AI / 45% Ad Fontes** blend (`adFontesCsv.ts`) |
| **Enrichment** | Tavily Search (optional) to attach real URLs to fact-check sources |
| **Data** | Ad Fontes–style CSV under `frontend/src/data/`; optional Supabase for analyses + feedback |
| **Analytics** | [`/traction-analytics`](frontend/src/app/traction-analytics/page.tsx) page + `GET /api/traction` (requires Supabase) |
| **Extension** | Chrome MV3: full `fetch-news` → `analyze` once; compact popup; **full report** hydrates the web app via `sessionStorage` (no second analyze) |

### Not implemented here (roadmap / don’t claim in submissions)

| Claim | Reality |
|-------|--------|
| Standalone **FastAPI** in `backend/` | **`backend/`** is a placeholder — APIs live in **Next.js** only. |
| **Trending news feed** / Tavily News–style discovery UI | **No** — `POST /api/fetch-news` scrapes **one URL** you send; there is no pre-built feed of headlines. |
| Edge-cached feed / URL-hash **cache** in DB | **Not** in code (future scalability only). |

See [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) **Roadmap** section for the canonical list.

---

## Quick start

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env.local   # GEMINI_API_KEY required; TAVILY_API_KEY optional
npm run dev
```

Open **http://localhost:3000**.

From repo root (if configured):

```bash
npm run install:all
cd frontend && cp .env.example .env.local
npm run dev
```

---

## Deploy (Vercel)

- Set the Vercel project **Root Directory** to **`frontend`**.
- Environment: see **`frontend/.env.example`** — at minimum **`GEMINI_API_KEY`**. Add **`TAVILY_API_KEY`**, **`SUPABASE_*`** as needed.

---

## Docs

| File | Purpose |
|------|---------|
| [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) | Product + technical master plan (hackathon submission) |
| [`docs/SYSTEM_FLOW.md`](docs/SYSTEM_FLOW.md) | User-facing flow |
| [`frontend/README.md`](frontend/README.md) | Frontend package |
| [`extension/README.md`](extension/README.md) | Chrome extension |

---

## License / attribution

Ad Fontes–style outlet data ships as CSV in the frontend bundle; see data files under `frontend/src/data/`. AI features use Google Gemini per your API terms.
