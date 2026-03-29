# Polarity AI — Master Plan

**Media Bias & Credibility Analysis Platform**

Repository: [github.com/pthaps/polarity-v2](https://github.com/pthaps/polarity-v2)  
Hackathon: New England Inter-Collegiate AI Hackathon · March 28–29, 2026

This document is the canonical description of what we are building. Code evaluation is scored against **plan alignment** — see sections below.

---

## Executive summary (one paragraph)

Polarity AI is a **real-time, article-level** media bias and credibility platform: a **Next.js 14** web app plus a **Chrome extension (Manifest V3)**. Users paste a **URL** or **raw article text** and receive, in roughly **under 20 seconds** (network and APIs permitting), a **five-bucket** political placement (Far Left → Far Right), a **credibility score (0–100)**, **keyword-level** bias signals, and **claim-level** fact-check blocks optionally enriched with **live URLs** via the **Tavily Search API**. Scores **blend AI output with human-curated Ad Fontes–style outlet baselines** at **55% AI / 45% historical** to temper model variance. The core technical design is a **parallel multi-agent pipeline**: **three independent Gemini calls** (Bias Analyst, Fact-Checker, Synthesizer) each see the **same article excerpt only**—no other agent’s reasoning—then a **fourth synthesis** call consumes **only short summaries and scores** to produce final metrics. Optional **Supabase** stores analyses and feedback; **CSV fallback** prevents data loss if the DB is down. The extension runs the **same** `fetch-news` → `analyze` pipeline and **hydrates** the full web dashboard via **`sessionStorage`**, avoiding a duplicate analyze call. Deployed on **Vercel** with serverless route handlers; features explicitly **not** in this build (e.g. multi-article trending feed, standalone FastAPI service) are listed under **Roadmap**.

---

## 1. Vision Clarity

Trust in media is fragile: readers struggle to tell reliable reporting from spin or misinformation on a **specific article**, not just a brand. Outlet-level ratings (AllSides, NewsGuard, Ad Fontes charts) help but do not answer: *Does this story, today, use manipulative language? Which claims are unverified?*

**Polarity AI** is a **real-time, article-level** bias and credibility tool. Paste a URL or article text and receive in roughly **under 20 seconds** (network and API permitting):

- Five-bucket political placement (Far Left → Far Right) and a **credibility score (0–100)**
- **Keyword-level** bias signals (loaded phrases from the text)
- **Claim-level** fact-check blocks with verdicts; **Tavily Search** enriches suggested sources with **live URLs** when configured
- Plain-English **final summary** and sub-metrics (political / language / coverage neutrality)

**North star:** Anyone — regardless of background — can read a news article and quickly see **how it is framed**, **which claims need scrutiny**, and **where it sits** on the spectrum, without an account or paywall for core use.

### Persona walkthrough (before → after)

| | **Before Polarity** | **After Polarity** |
|---|---------------------|---------------------|
| **Sam (student)** | Opens a partisan op-ed for a paper; spends 25 minutes opening secondary tabs to check one statistic and headline spin. | Pastes the URL; in one screen sees **bias placement**, **loaded phrases**, **claims with verdicts**, and a **short summary** — enough to decide what to cite and what to verify further. |
| **Jordan (voter)** | Reads a breaking policy article; unsure if emotional wording or missing context. | Gets **explicit framing signals** + **credibility blended with outlet history** so they can read with eyes open, not blind trust. |

---

## 2. Problem Definition

**Problem:** A reader opens a CNN or Fox article on a policy story. They cannot quickly tell if the headline matches the body, if statistics are sourced, or if framing favors one side. Options are blind trust, long cross-checking, or giving up — all poor outcomes.

**Evidence (scale of confusion):** Pew Research Center (2024) reports that **67% of U.S. adults** find it hard to tell **real news from false** online — a useful anchor for why **article-level** tools matter, not only outlet labels.

**Who feels this most:** Voters during elections; students and teachers grading sources; journalists comparing coverage; social users before sharing; teams judging internal links.

**Scale:** Anyone who reads news online faces this daily. The product is scoped to **actionable article-level insight**, not replacing human editors or legal fact-finding.

---

## 3. Technical Depth

### Stack

| Layer | Choice |
|--------|--------|
| App | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| APIs | Next.js Route Handlers under `frontend/src/app/api/` |
| AI | Google Gemini via `@/lib/gemini` (default model configurable; see below) |
| Search enrichment | Tavily Search API (optional; gated by `TAVILY_API_KEY`) |
| Outlet baseline | Ad Fontes–style CSV (`frontend/src/data/ad-fontes-media.csv`), domain match |
| Persistence | Supabase Postgres (optional): analyses + feedback; RLS-friendly client |
| Extension | Chrome Manifest V3, vanilla JS popup + service worker |
| Deploy | Vercel (root **`frontend/`**) |

### Gemini model choice and token budget

- **Default model:** `gemini-2.5-flash` (overridable with `GEMINI_MODEL`). Fallback aliases in code include `gemini-2.5-flash-lite` and `gemini-flash-latest` if the primary ID is unavailable.
- **Why Flash (not Pro) for this MVP:** **Latency and cost** — we run **three parallel agent calls** plus **one synthesis** plus optional Tavily; Flash-class models keep end-to-end time inside the **~20s UX target** and stay within **free-tier RPM** constraints better than Pro for the same call volume.
- **Approximate token budget (order of magnitude):** Article body is capped at **~3,500 characters** for analysis (`MAX_BODY` in `/api/analyze`). Each agent prompt includes instructions + full excerpt → rough **~2k–5k input tokens per agent** (language-dependent); synthesis prompt is **much smaller** (only the three **summaries + scores**, not full agent essays). These are **estimates** for planning, not hard guarantees.

### API surface (implemented)

| Route | Role |
|--------|------|
| `POST /api/fetch-news` | Resolve **one** URL → title, description, body (Cheerio; body truncated for analysis) |
| `POST /api/analyze` | Parallel **3 agents** + final synthesis; blend with Ad Fontes; optional Tavily enrichment; optional Supabase insert |
| `POST /api/feedback` | User feedback; Supabase + CSV fallback (`feedbackCsv.ts`) |
| `GET /api/traction` | Lightweight analytics (counts + recent rows; requires Supabase) |
| `POST /api/extension-analyze` | Lighter Gemini path for quick bias/credibility (optional; still available) |

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

### Why three different agents (not one big prompt)?

| Agent | Mission (distinct system prompts) | Reduces anchoring because… |
|--------|-----------------------------------|-----------------------------|
| **Bias** | Surface **loaded language, framing, emotional wording**; output **KEYWORDS** | Optimized for **linguistic** critique, not fact extraction. |
| **Fact-check** | Extract **3–5 concrete claims**; **CLAIM / VERDICT / SOURCE** structure | Forces **evidence-shaped** output, not a general “vibe” score. |
| **Synthesizer** | Holistic **reliability + balance** assessment | Separate objective from nitpicking diction or claims in isolation. |

A **single** structured prompt would force one model to **trade off** these objectives in one pass; early choices (e.g. choosing a headline tone) can **anchor** all later judgments. **Parallel cold starts** mean no agent sees another’s full reasoning; the **final** step only sees **summaries**, so no single agent dominates the numeric scores.

---

## 5. Feasibility

Shipped in a hackathon-style cadence: monorepo, Next API routes (no separate backend required), CSV baseline, Gemini Flash–class latency, free tiers for demo. Retry/backoff on 429 in the analyze path.

**Extension provenance:** The **pipeline** (fetch + full analyze + sessionStorage hydrate) was implemented and **tested end-to-end** against **local and deployed** `apiBaseUrl` during this project window. The repo builds on an **earlier polarity layout** (monorepo folders, extension shell); the **current** behavior matches the **Roadmap / Integrity** sections—not a separate fictional product.

---

## 6. Scalability Design

- **Vercel** serverless instances scale horizontally; **Gemini RPM** is the main bottleneck — paid tier + caching reduce cost per repeat URL.
- **Ad Fontes CSV:** Loaded per serverless instance from the bundle; at very high concurrency, **multiple instances** re-read the same file (acceptable for demo). Production path: **indexed Supabase table** keyed by domain.
- **Request deduplication (future):** Short-lived **edge or in-memory** lock keyed by `sha256(url)` to collapse duplicate simultaneous analyzes of the same article.
- **URL-hash cache in Supabase (design sketch, not implemented):** Table e.g. `analysis_cache(url_hash, payload jsonb, created_at)`. **Key:** `sha256(normalized_url)`; **TTL:** e.g. **24h** for news, **7d** for evergreen (tunable). **Hit:** return `payload` without calling Gemini; **miss:** run pipeline, insert row. Evict with scheduled job or `created_at` filter on read.

---

## 7. Ecosystem Thinking

- **`POST /api/analyze`** accepts `{ url, title, description, body }` and returns JSON — same contract the web app uses.
- **Today’s “external developer” story:** The production app is **first-party**: browser calls **same-origin** `/api/*` on the deployed Vercel domain. **CORS** is default Next behavior for same deployment; **we do not yet expose a public cross-origin API with API keys** (see Roadmap).
- **Extension:** Options page sets **API base URL** so any **deployed** Polarity instance (team, school, self-hosted) can be targeted — the client is still **your** frontend origin calling **your** API.
- **Future:** API keys, per-key rate limits, embed widget, Slack — same JSON contract with a **versioned** path (e.g. `/api/v1/analyze`) when shipped.

---

## 8. User Impact

**Directional claim:** Collapse **many minutes** of manual cross-checking into **one structured flow** (bias + claims + links in one place).

**Order-of-magnitude anchor:** **Billions** of people read news online daily; even a **tiny fraction** (e.g. **0.1%** of English-language mobile news readers ≈ **hundreds of thousands** of potential sessions) adopting a tool that saves **5–15 minutes** per deep-read would reclaim **thousands of person-hours per day** in aggregate. We do not claim precise market share; we claim **high leverage per session** for the target user (student, voter, journalist).

**Measurement:** Feedback (`/api/feedback`) and **Traction Analytics** (`GET /api/traction` + `/traction-analytics` page) support **positive rate** and volume over time.

---

## 9. Market Awareness

**Legacy competitors:** AllSides, MBFC, NewsGuard, Ground News — largely **outlet- or subscription-centric**; rarely **this article / this claim** in one free flow.

**LLM-era note:** Many teams now ship **“paste article → GPT-style verdict”** wrappers. Polarity differs by **(1)** **three isolated specialist prompts** + **summary-only synthesis**, **(2)** **Ad Fontes blending**, **(3)** **structured claims + optional Tavily URLs**, and **(4)** **explicit out-of-scope** honesty in docs — reducing “generic chatbot” risk in judging.

---

## 10. Team Execution Plan (24h-style roadmap)

| Hours (approx.) | Phase | Deliverables | Owner (lead) |
|-----------------|--------|--------------|----------------|
| **0–3** | Foundation | Monorepo, env, Ad Fontes CSV, domain lookup | Alok |
| **3–8** | Core API | `/api/analyze`, parallel agents, parsing, blending | Alok |
| **8–12** | Frontend UI | URL + paste, dashboard, spectrum, cards | Prince |
| **12–16** | Intelligence | Tavily enrichment, keywords, claim UI | Alok |
| **16–19** | Platform | Feedback, traction page, Supabase, dark mode | Leandhy |
| **19–22** | Extension | MV3 popup, options, full pipeline + hydrate | Prince |
| **22–24** | Polish | Vercel, README, master plan, error states | Alok |

*Checkpoint:* after **Core API**, demo **curl/Postman** analyze; after **UI**, demo **happy path** URL; after **Extension**, demo **popup + full report** on deployed URL.

---

## 11. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Gemini rate limits | Parallel agents + staggered retry/backoff; truncate body (~3500 chars); upgrade key |
| Scrape failures | Paste-text mode |
| Tavily slow / missing key | Degrades to AI-only sources |
| Model variance | Ad Fontes blend + confidence-style fields |
| Cold starts | Warm-up ping; Pro plans if needed |
| **Chrome Web Store / review** | Not required for hackathon: **unpacked** extension. **Contingency:** demo **web-only** (same analysis on Vercel) if extension fails on a judge machine. |
| Supabase down | CSV feedback fallback; analyses optional |

---

## 12. Differentiation Strategy

**Priority order (for judges):**

1. **Article-level** scores vs outlet-only labels.  
2. **Transparent** keywords + claim blocks vs a single opaque score.  
3. **Live URL enrichment** when Tavily is on.  
4. **Multi-agent + blend** vs single prompt or static charts.  
5. **Free core path**, self-hostable repo, extension + web.

### 30-second pitch (one sentence)

**Polarity tells you how *this* article is framed and which claims need scrutiny—not just what CNN or Fox “usually” looks like—by blending independent AI specialists with Ad Fontes outlet truth and optional live source links.**

---

## Roadmap (explicitly not shipped here)

These items are **out of scope for the current codebase** or exist only as notes — do **not** assume they are deployed:

| Item | Status in repo |
|------|------------------|
| Standalone **`backend/`** FastAPI service | **`backend/`** contains `README.md` only; APIs are **Next.js Route Handlers** under `frontend/src/app/api/`. |
| **Trending news / multi-article feed** (Tavily News–style cards) | **Not implemented.** `POST /api/fetch-news` takes **one** `url` and returns scraped title/description/body for that page. |
| **URL-hash analysis cache** in Supabase | **Not implemented** (design in §6). |
| **Public API key auth** / embed widget | **Roadmap**; `POST /api/analyze` is same-origin / server callers per deployment today. |

---

## Integrity

This plan tracks **what is in the repository** for hackathon scoring. The **code** uses **three parallel panel agents** plus a **fourth synthesis** pass — see `frontend/src/lib/agents.ts` and `frontend/src/app/api/analyze/route.ts`. **`POST /api/fetch-news` is single-URL article extraction**, not a feed aggregator.
