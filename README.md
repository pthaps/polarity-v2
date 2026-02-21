# FactCheck Debate

A web app that analyzes political news from multiple perspectives. Enter a news URL and a **Host** plus **7 panel characters** debate the article and produce a **Credibility Score**, **Bias Meter**, and a **final summary**.

## Panel

- **Host** — Facilitator; keeps the discussion on topic.
- **Morgan** (Progressive) — Champion of equality; social justice lens.
- **Victor** (Conservative) — Guardian of order; tradition and stability.
- **Skeptica** (Devil's Advocate) — Questions everything; skeptical view.
- **Lens** (Bias Analyst) — Spots the spin; media bias and framing.
- **Verify** (Fact-Checker) — Evidence only; verifies claims and sources.
- **Bridge** (Synthesizer) — Finds common ground; objective synthesis.
- **Terra** (Pragmatist) — Real-world impact; practical implications.

## Setup

1. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Environment variables**  
   Create `.env.local` with:
   - `OPENAI_API_KEY` — OpenAI API key (required for analysis)
   - `SUPABASE_URL` / `SUPABASE_KEY` — Optional; for saving analysis history
   - `FACTCHECK_API_KEY` — Optional; for future fact-check API use

3. **Supabase (optional)**  
   To store analysis history, run `supabase-migration.sql` in the Supabase SQL Editor to create the `analyses` table.

## Run

```bash
npm run dev
```

Open http://localhost:3000, paste a news article URL, and click **Analyze**. The Host sets the focus, then each panelist speaks in order. The result shows a **Credibility Score** (0–100, color-coded), a **Bias Meter** (Left–Center–Right with confidence), and a **Final summary**.

## Tech stack

- Next.js 14 (App Router)
- OpenAI API (GPT)
- Cheerio (URL content extraction)
- Supabase (optional history)
- Tailwind CSS
