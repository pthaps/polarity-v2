# Polarity AI

**Real-time media bias and credibility analysis platform.**

Paste any news URL or article text → get a bias placement on a five-point political spectrum, a credibility score, keyword-level bias flags, claim-by-claim fact-checks with live source URLs, and a plain-English summary — in under 20 seconds.

🔗 **Live demo:** [polarity-v2.vercel.app](https://polarity-v2.vercel.app)

---

## What it does

- **Bias Analyst** — detects loaded language, emotional framing, and selective omission. Outputs specific flagged keywords.
- **Fact-Checker** — extracts 3-5 specific claims. Each gets a verdict (Supported / Unverified / Disputed) with real source URLs via Tavily Search.
- **Synthesizer** — balanced overall reliability and bias assessment.
- **Final synthesis** — blends all three agents + Ad Fontes outlet baseline into a single credibility score, horizontal bias estimate, and plain-English summary.
- **Chrome Extension** — calls the same pipeline as the web app (`/api/fetch-news` → `/api/analyze`).
- **Traction Analytics** — live dashboard of usage metrics from Supabase.
- **Feedback system** — thumbs up/down + comment, persisted to Supabase with CSV fallback.
- **Dark mode** — full theme support persisted via localStorage.

---

## Architecture

```
User Input (URL or text)
        │
        ▼
┌─────────────────────────────────────────┐
│           /api/analyze                  │
│                                         │
│  ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Bias    │ │   Fact-   │ │Synthe- │ │  ← 3 Gemini calls in parallel
│  │ Analyst  │ │  Checker  │ │ sizer  │ │
│  └──────────┘ └───────────┘ └────────┘ │
│        │            │            │      │
│        └────────────┴────────────┘      │
│                     │                   │
│          ┌──────────┴──────────┐        │
│          │   Final Synthesis   │  ← Gemini call #4
│          │   + Tavily Enrich   │  ← Tavily runs in parallel
│          └──────────┬──────────┘        │
│                     │                   │
│          Ad Fontes Baseline Blend       │
│          (55% AI / 45% outlet data)     │
└─────────────────────┬───────────────────┘
                      │
                      ▼
              JSON Response → UI Dashboard
                      │
                      ▼
              Supabase (analyses table)
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript |
| API | Next.js API Routes — `/api/analyze`, `/api/fetch-news`, `/api/feedback`, `GET /api/traction`; optional `/api/extension-analyze` (lightweight single-call) |
| AI | Google Gemini — default **`gemini-2.5-flash`** (`GEMINI_MODEL` override); 3 parallel agents + 1 synthesis pass |
| Web Search | Tavily Search API — real-time source enrichment for fact-checker claims |
| Outlet Baseline | Ad Fontes Media CSV — 50+ outlets with reliability (0-64) and bias (-42 to +42) scores |
| Database | Supabase (Postgres) — analyses + feedback tables with RLS |
| Extension | Chrome Extension (Manifest V3) |
| Deployment | Vercel |

---

## Repository structure

```
polarity-v2/
├── frontend/                  # Next.js app (main product)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Main UI — landing + results dashboard
│   │   │   ├── term-key/page.tsx      # Glossary of all metrics
│   │   │   ├── traction-analytics/    # Live usage KPI dashboard
│   │   │   └── api/
│   │   │       ├── analyze/route.ts       # Core 3-agent analysis pipeline
│   │   │       ├── feedback/route.ts      # User feedback (Supabase + CSV)
│   │   │       ├── traction/route.ts      # Usage analytics from Supabase
│   │   │       ├── fetch-news/route.ts    # Article scraper (Cheerio)
│   │   │       └── extension-analyze/     # Optional lightweight Gemini-only path (extension uses fetch-news + analyze)
│   │   ├── components/
│   │   │   └── Navbar.tsx             # Sticky nav with dark mode toggle
│   │   ├── lib/
│   │   │   ├── agents.ts              # Agent prompts (Bias, Fact-Check, Synthesizer)
│   │   │   ├── gemini.ts              # Gemini client with retry logic
│   │   │   ├── adFontesCsv.ts         # Ad Fontes CSV parser + blending formula
│   │   │   ├── supabase.ts            # Supabase client
│   │   │   ├── fetchArticleHtml.ts    # Cheerio article scraper
│   │   │   └── feedbackCsv.ts         # CSV fallback for feedback persistence
│   │   └── data/
│   │       └── ad-fontes-media.csv    # Outlet bias + reliability baseline data
│   ├── .env.example                   # Required environment variables
│   └── supabase-migration.sql         # SQL to create analyses + feedback tables
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html / popup.js
│   ├── background.js
│   └── options.html / options.js
└── docs/                      # System flow documentation
```

---

## Quick start

```bash
git clone https://github.com/pthaps/polarity-v2.git
cd polarity-v2/frontend
npm install --legacy-peer-deps
cp .env.example .env.local
# Edit .env.local — add your keys (see Environment Variables below)
npm run dev
```

Open **http://localhost:3000**

---

## Environment variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key        # https://aistudio.google.com/app/apikey

# Optional — real-time source enrichment for fact-checker
TAVILY_API_KEY=your_tavily_api_key        # https://tavily.com

# Optional — analysis history + feedback storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Optional — override default AI model (default in code: gemini-2.5-flash)
# GEMINI_MODEL=gemini-2.5-flash-lite
```

The app works without Tavily and Supabase — they degrade gracefully. Only `GEMINI_API_KEY` is required.

---

## Supabase setup

Run `frontend/supabase-migration.sql` in your Supabase SQL editor to create the `analyses` and `feedback` tables with the correct RLS policies.

---

## Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Click the Polarity icon in your toolbar on any news page
5. Go to **Options** to set your deployed Vercel URL (default: `http://localhost:3000`)

---

## Deployment (Vercel)

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variables: `GEMINI_API_KEY`, `TAVILY_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
4. Deploy — auto-deploys on every push to `main`

---

## How scoring works

**Bias placement** maps the AI horizontal estimate (-42 to +42) to five categories:
- Far Left: ≤ -26 | Lean Left: -25 to -9 | Center: -8 to +8 | Lean Right: +9 to +25 | Far Right: ≥ +26

**Credibility score** blends AI assessment with Ad Fontes outlet historical data:
- `reliability = (0.45 × Ad Fontes vertical rank normalized to 0-100) + (0.55 × AI credibility)`
- `horizontal = (0.45 × Ad Fontes horizontal rank) + (0.55 × AI horizontal estimate)`
- When no outlet baseline exists, AI scores are used at 100% weight.

**Sub-scores** (Political Neutrality, Language Neutrality, Coverage Balance) are computed per-article by the synthesis call — not from outlet history.

---

## API

The `/api/analyze` endpoint is publicly callable:

```bash
curl -X POST https://your-deployment.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "title": "Article title",
    "description": "Article description",
    "body": "Full article text..."
  }'
```

Response includes: `credibilityScore`, `horizontalRank`, `biasCategory`, `biasConfidence`, `politicalNeutrality`, `languageNeutrality`, `coverageBalance`, `finalSummary`, `replies[]`, `outletBaseline`.

---

*Polarity AI — Look Beneath the Surface*