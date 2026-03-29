# Polarity AI — Frontend

Next.js 14 app containing the full product: UI, API routes, AI pipeline, and data layer.

See the [root README](../README.md) for full documentation, architecture, and setup instructions.

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # add GEMINI_API_KEY (required)
npm run dev                  # http://localhost:3000
npm run build                # production build
```

## Key files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main UI — landing page + results dashboard |
| `src/app/api/analyze/route.ts` | Core 3-agent parallel analysis pipeline |
| `src/app/api/feedback/route.ts` | User feedback — Supabase + CSV fallback |
| `src/app/api/traction/route.ts` | Live usage analytics |
| `src/lib/agents.ts` | Agent system prompts (Bias, Fact-Check, Synthesizer) |
| `src/lib/gemini.ts` | Gemini client with retry + rate limit handling |
| `src/lib/adFontesCsv.ts` | Ad Fontes CSV parser + 55/45 blending formula |
| `src/lib/feedbackCsv.ts` | CSV fallback for feedback persistence |
| `supabase-migration.sql` | SQL to create analyses + feedback tables with RLS |