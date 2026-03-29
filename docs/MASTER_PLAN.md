# Polarity AI — Master Plan

**Media Bias & Credibility Analysis Platform**

Repository: [github.com/pthaps/polarity-v2](https://github.com/pthaps/polarity-v2)  
Hackathon: New England Inter-Collegiate AI Hackathon · March 28–29, 2026

This document is the canonical description of what we are building. Code evaluation is scored against **plan alignment** — see sections below.

---

## 1. Vision Clarity

Trust in media is fragile: readers struggle to tell reliable reporting from spin or misinformation on a **specific article**, not just a brand. Outlet-level ratings (AllSides, NewsGuard, Ad Fontes charts) help but do not answer: *Does this story, today, use manipulative language? Which claims are unverified?*

**Polarity AI** is a **real-time, article-level** bias and credibility tool. Paste a URL or article text and receive in roughly **under 20 seconds** (network and API permitting):

- Five-bucket political placement (Far Left → Far Right) and a **credibility score (0–100)**
- **Keyword-level** bias signals (loaded phrases from the text)
- **Claim-level** fact-check blocks with verdicts; **Tavily Search** enriches suggested sources with **live URLs** when configured
- Plain-English **final summary** and sub-metrics (political / language / coverage neutrality)

**North star:** Anyone — regardless of background — can read a news article and quickly see **how it is framed**, **which claims need scrutiny**, and **where it sits** on the spectrum, without an account or paywall for core use.

---

## 2. Problem Definition

**Problem:** A reader opens a CNN or Fox article on a policy story. They cannot quickly tell if the headline matches the body, if statistics are sourced, or if framing favors one side. Options are blind trust, long cross-checking, or giving up — all poor outcomes.

**Who feels this most:** Voters during elections; students and teachers grading sources; journalists comparing coverage; social users before sharing; teams judging internal links.

**Scale:** Anyone who reads news online faces this daily. The product is scoped to **actionable article-level insight**, not replacing human editors or legal fact-finding.

---

## 3. Technical Depth

### Stack

| Layer | Choice |
|--------|--------|
| App | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| APIs | Next.js Route Handlers under `frontend/src/app/api/` |
| AI | Google Gemini (via `@/lib/gemini`; model configurable) |
| Search enrichment | Tavily Search API (optional; gated by `TAVILY_API_KEY`) |
| Outlet baseline | Ad Fontes–style CSV (`frontend/src/data/ad-fontes-media.csv`), domain match |
| Persistence | Supabase Postgres (optional): analyses + feedback; RLS-friendly client |
| Extension | Chrome Manifest V3, vanilla JS popup + service worker |
| Deploy | Vercel (root **`frontend/`**) |

### API surface (implemented)

| Route | Role |
|--------|------|
| `POST /api/fetch-news` | Resolve URL → title, description, body (Cheerio; body truncated for analysis) |
| `POST /api/analyze` | Parallel **3 agents** + final synthesis; blend with Ad Fontes; optional Tavily enrichment; optional Supabase insert |
| `POST /api/feedback` | User feedback; Supabase + CSV fallback (`feedbackCsv.ts`) |
| `GET/POST /api/traction` | Lightweight analytics |
| `POST /api/extension-analyze` | Lighter Gemini path for quick bias/credibility (still available) |

### Analysis pipeline (as implemented)

1. **Input:** URL → scrape; or paste mode with raw text (paywall bypass).
2. **Baseline:** Domain matched to Ad Fontes row (reliability rank 0–64, horizontal −42…+42).
3. **Parallel agents:** Three agents run **in parallel** (`Promise.all`): Bias Analyst, Fact-Checker, Synthesizer — each sees the same article excerpt **cold** (no cross-agent text in the first pass).
4. **Synthesis:** One Gemini call consumes **only short summaries/scores** from those three to emit structured scores (`CREDIBILITY_SCORE`, `HORIZONTAL_ESTIMATE`, neutrality sub-scores, `FINAL_SUMMARY`).
5. **Tavily (optional):** Runs **in parallel** with the synthesis step to replace fact-checker `SOURCE` lines with real URLs/snippets where possible.
6. **Blend:** `blendReliabilityAndHorizontal` — **55% AI / 45% Ad Fontes** for both reliability and horizontal (see `frontend/src/lib/adFontesCsv.ts`).

### Data schema (response highlights)

`credibilityScore`, `horizontalRank`, `biasCategory`, `biasConfidence`, `politicalNeutrality`, `languageNeutrality`, `coverageBalance`, `replies[]` (per agent: text, summary, score, keywords), `outletBaseline`, `finalSummary`.

### Supabase

Tables for analyses and feedback (when `SUPABASE_*` env vars are set). Feedback path supports **CSV append** if DB insert fails, to reduce data loss.

### Chrome extension (current behavior)

- Background runs **`fetch-news` → `analyze`** once per scan; stores **`fullResult`**.
- Popup shows a **compact** reliability + bias summary.
- **“Full report”** opens the web app and injects `sessionStorage` (`polarity-hydrate`) so the **full dashboard loads without a second `/api/analyze`** (see `frontend` hydrate effect).

---

## 4. Innovation

1. **Article-level + claim-level:** Not only outlet priors — this story’s language and claims.
2. **Independent parallel agents** before synthesis — reduces single-prompt anchoring.
3. **Tavily-backed URLs** when configured — moves citations toward verifiable links.
4. **Blended scoring** — AI responsiveness anchored by human-curated outlet data.

---

## 5. Feasibility

Shipped in a hackathon-style cadence: monorepo, Next API routes (no separate backend required), CSV baseline, Gemini Flash–class latency, free tiers for demo. Retry/backoff on 429 in the analyze path.

---

## 6. Scalability Design

- Serverless horizontal scaling on Vercel; optional **URL-hash caching** in Supabase (future).
- Ad Fontes CSV can migrate to indexed DB table at scale.
- Rate limits (Gemini RPM) are the main bottleneck — paid keys and caching mitigate.
- Extension remains a thin client to the same deployment.

---

## 7. Ecosystem Thinking

- `POST /api/analyze` accepts `{ url, title, description, body }` — callable by any client with CORS/host rules respected.
- Extension uses configurable **API base URL** (localhost or production).
- Future: API keys, embed widget, Slack — same JSON contract.

---

## 8. User Impact

Target outcome: collapse **many minutes** of manual cross-checking into **one flow** with structured bias, claims, and links — measurable time saved per session. Feedback (thumbs + comment) and traction endpoints support product learning.

---

## 9. Market Awareness

**Outlet tools** (AllSides, MBFC, NewsGuard, Ground News) skew **outlet- or subscription-centric** and rarely do **this article / this claim** in one free flow. **Polarity** combines article-level multi-agent analysis, structured claims, optional live URLs, Ad Fontes anchoring, and deployability.

---

## 10. Team Execution Plan (24h-style roadmap)

| Phase | Focus |
|--------|--------|
| Foundation | Next app, env, Ad Fontes CSV, domain lookup |
| Core API | `/api/analyze`, parallel agents, parsing, blending |
| UI | URL + paste, results dashboard, spectrum, cards |
| Intelligence | Tavily enrichment, keywords, claim UI |
| Platform | Feedback, traction, Supabase, dark mode |
| Extension | MV3 popup, options, full pipeline + hydrate to web |
| Polish | Vercel, README, master plan, error states |

---

## 11. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Gemini rate limits | Parallel agents + staggered retry/backoff; truncate body (~3500 chars); upgrade key |
| Scrape failures | Paste-text mode |
| Tavily slow / missing key | Degrades to AI-only sources |
| Model variance | Ad Fontes blend + confidence-style fields |
| Cold starts | Warm-up ping; Pro plans if needed |

---

## 12. Differentiation Strategy

1. **Article-level** scores vs outlet-only labels.  
2. **Transparent** keywords + claim blocks vs a single opaque score.  
3. **Live URL enrichment** when Tavily is on.  
4. **Multi-agent + blend** vs single prompt or static charts.  
5. **Free core path**, self-hostable repo, extension + web.

---

## Integrity

This plan describes the **intended and implemented** system. Where the UI copy still says “seven experts,” the **code** uses **three parallel panel agents** plus a **fourth synthesis** pass — see `frontend/src/lib/agents.ts` and `/api/analyze`.
