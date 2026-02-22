"use client";

import { useState } from "react";
import { PANEL_ORDER } from "@/lib/agents";

type Result = {
  url: string;
  title: string;
  replies: { agentId: string; name: string; shortName: string; color: string; text: string; summary: string; score: number | null }[];
  finalSummary?: string;
  credibilityScore?: number;
  biasPosition?: string;
  biasConfidence?: number;
};

const AD_FONTES_LABELS = ["Far Left", "Left", "Center", "Right", "Far Right"] as const;
const AD_FONTES_VALUES = [-42, -21, 0, 21, 42] as const;

function biasPositionToAdFontesScore(position: string): number {
  if (/far\s*left/i.test(position)) return -42;
  if (/^left$/i.test(position) || /center-left/i.test(position)) return -21;
  if (/^center$/i.test(position) && !/left|right/i.test(position)) return 0;
  if (/^right$/i.test(position) || /center-right/i.test(position)) return 21;
  if (/far\s*right/i.test(position)) return 42;
  if (/center-left/i.test(position)) return -10;
  if (/center-right/i.test(position)) return 10;
  return 0;
}

function adFontesScoreToPercent(score: number): number {
  return ((score + 42) / 84) * 100;
}

const LOGO_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
    <circle cx="16" cy="16" r="14" fill="#E0EDF8" />
    <circle cx="12" cy="12" r="4" fill="#93C5FD" />
    <circle cx="20" cy="12" r="4" fill="#93C5FD" />
    <ellipse cx="16" cy="20" rx="6" ry="5" fill="#C8D8EC" />
    <circle cx="12" cy="11" r="1.5" fill="#1A1916" />
    <circle cx="20" cy="11" r="1.5" fill="#1A1916" />
    <path d="M14 18 Q16 20 18 18" stroke="#1A1916" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

type PanelMember = (typeof PANEL_ORDER)[number];
function getCharacter(m: PanelMember) {
  const x = m as PanelMember & { characterName?: string; characterTagline?: string; icon?: string };
  return { name: x.characterName ?? m.shortName, tagline: x.characterTagline ?? "", icon: x.icon ?? "•" };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const fetchRes = await fetch("/api/fetch-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const fetchData = await fetchRes.json();
      if (!fetchRes.ok) {
        setError(fetchData.error || "Failed to fetch news.");
        setLoading(false);
        return;
      }
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fetchData.url,
          title: fetchData.title,
          description: fetchData.description,
          body: fetchData.body,
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) {
        setError(analyzeData.error || "Analysis failed.");
        setLoading(false);
        return;
      }
      setResult(analyzeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const biasScore = result ? biasPositionToAdFontesScore(result.biasPosition ?? "Center") : 0;
  const biasPercent = adFontesScoreToPercent(biasScore);
  const cred = result?.credibilityScore ?? 0;
  const reliability64 = Math.round((cred / 100) * 64);
  const neutralityPct = Math.round(100 - Math.min(100, (Math.abs(biasScore) / 42) * 40));
  const factualPct = Math.round(cred * 0.85);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-6 backdrop-blur md:px-10">
        <div className="flex items-center gap-2">
          {LOGO_SVG}
          <span className="font-display text-xl tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--accent-brown)" }}>
            Polarity
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="text-sm text-[var(--text2)] hover:text-[var(--text)]">Ad Fontes Methodology</a>
          <span className="text-sm font-medium text-[var(--text2)]">8-Panel AI Analysis</span>
          <span className="flex items-center gap-1.5 text-sm text-[var(--green)]">
            <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
            Live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        {!result ? (
          <>
            {/* Hero - Image 1 style */}
            <div className="mb-10">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-widest text-[var(--text3)]">
                  Real-time media bias analysis
                </span>
                <span className="flex-1 border-t border-[var(--border)]" />
              </div>
              <h1 className="mb-4 font-display text-4xl font-normal leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                Where does your source <span style={{ color: "var(--accent-blue)" }}>actually</span>{" "}
                <span style={{ color: "var(--accent-red)" }}>stand?</span>
              </h1>
              <p className="mb-6 max-w-xl text-[15px] leading-relaxed text-[var(--text2)]">
                Polarity evaluates news articles across the political spectrum using a Host and seven AI panelists — each representing a distinct political perspective — and synthesizes them into a single bias score.
              </p>
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm text-[var(--text2)]">
                <span>Far-Left</span><span className="text-[var(--text3)]">·</span>
                <span>Left</span><span className="text-[var(--text3)]">·</span>
                <span>Center</span><span className="text-[var(--text3)]">·</span>
                <span>Right</span><span className="text-[var(--text3)]">·</span>
                <span>Far-Right</span><span className="text-[var(--text3)]">·</span>
                <span>Multi-Agent Analysis</span>
              </div>
            </div>

            {/* Input card - Image 1 style */}
            <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
              <div className="flex border-b border-[var(--border)]">
                <button type="button" className="px-5 py-3.5 text-sm font-medium text-[var(--text3)] hover:text-[var(--text2)]">
                  Paste Article Text
                </button>
                <button
                  type="button"
                  className="relative border-b-2 border-[var(--text)] bg-[var(--surface2)] px-5 py-3.5 text-sm font-medium text-[var(--text)]"
                >
                  Paste URL
                </button>
              </div>
              <div className="border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-2.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--text3)]">Article URL</span>
              </div>
              <div className="p-5">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface2)] px-5 py-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[var(--text)] px-8 py-3 text-sm font-bold text-white shadow hover:bg-[var(--text2)] disabled:opacity-50"
                >
                  {loading ? "Analyzing…" : "Analyze"}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Results - Image 2 Ad Fontes dashboard */
          <div className="space-y-8">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">
                Political Bias — Ad Fontes Scale
              </h2>
              <div className="mb-2 flex overflow-hidden rounded-lg border border-[var(--border)]">
                {AD_FONTES_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className="flex-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-white"
                    style={{
                      background: label === "Far Left" ? "var(--far-left)" : label === "Left" ? "var(--left)" : label === "Center" ? "var(--centrist)" : label === "Right" ? "var(--right)" : "var(--far-right)",
                      color: label === "Center" ? "white" : "rgba(0,0,0,0.7)",
                    }}
                  >
                    {label.replace(" ", "\n")}
                  </div>
                ))}
              </div>
              <div className="relative mb-1 h-3 w-full overflow-hidden rounded-md" style={{ background: "linear-gradient(to right, var(--far-left) 0%, var(--left) 25%, var(--centrist) 50%, var(--right) 75%, var(--far-right) 100%)" }}>
                <div
                  className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--text)] bg-white shadow-md transition-all duration-500"
                  style={{ left: `${Math.min(100, Math.max(0, biasPercent))}%` }}
                />
              </div>
              <div className="mb-1 flex justify-between text-[11px] text-[var(--text3)]">
                <span>-42 Far Left</span>
                <span>-21</span>
                <span>0 Center</span>
                <span>+21</span>
                <span>+42 Far Right</span>
              </div>
              <div className="text-center">
                <div className="font-display text-5xl font-normal" style={{ fontFamily: "var(--font-display)", color: biasScore < 0 ? "var(--left)" : biasScore > 0 ? "var(--far-right)" : "var(--centrist)" }}>
                  {biasScore > 0 ? "+" : ""}{biasScore}
                </div>
                <div className="mt-1 text-sm text-[var(--text3)]">
                  {result.biasPosition ?? "Center"} · Ad Fontes Scale -42 (Far Left) to +42 (Far Right)
                </div>
              </div>
            </div>

            {/* Four summary cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { title: "Reliability", score: `${reliability64}/64`, desc: "High Reliability", color: "var(--green-light)", pct: (reliability64 / 64) * 100 },
                { title: "Bias Score", score: `${biasScore > 0 ? "+" : ""}${biasScore}/±42`, desc: result.biasPosition ?? "Center", color: biasScore < 0 ? "var(--left)" : biasScore > 0 ? "var(--far-right)" : "var(--centrist)", pct: biasPercent },
                { title: "Neutrality Index", score: `${neutralityPct}%`, desc: "Balanced", color: "var(--green-light)", pct: neutralityPct },
                { title: "Factual Expression", score: `${factualPct}%`, desc: "Reporting vs opinion", color: "var(--green-light)", pct: factualPct },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{card.title}</div>
                  <div className="text-2xl font-bold" style={{ color: card.color }}>{card.score}</div>
                  <div className="text-xs text-[var(--text2)]">{card.desc}</div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${card.pct}%`, background: card.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Factors + Warning / Positive */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Ad Fontes Factors</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Expression / Reporting", pct: factualPct },
                    { label: "Veracity / Accuracy", pct: Math.min(95, reliability64 + 10) },
                    { label: "Headline Accuracy", pct: Math.min(90, cred) },
                    { label: "Political Neutrality", pct: neutralityPct },
                    { label: "Language Neutrality", pct: neutralityPct },
                    { label: "Coverage Balance", pct: Math.min(75, neutralityPct + 10) },
                  ].map((f) => (
                    <li key={f.label}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-[var(--text2)]">{f.label}</span>
                        <span className="font-medium">{f.pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${f.pct}%`, background: f.pct >= 70 ? "var(--green-light)" : "var(--orange)" }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--red-warn)]">Warning Signs</h3>
                  <ul className="space-y-2 text-sm text-[var(--text2)]">
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Check headline for emotionally charged terms</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Consider multiple sources for balance</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Review panel summary below for caveats</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--green)]">Positive Signals</h3>
                  <ul className="space-y-2 text-sm text-[var(--text2)]">
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Multi-perspective panel analysis</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Credibility and bias scores provided</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Synthesis from Host and 7 panelists</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Summary + source */}
            <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Summary</h3>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text)]">
                {result.finalSummary || "No summary available."}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent-blue)] underline hover:no-underline">
                Open article →
              </a>
              <p className="mt-1 truncate text-sm text-[var(--text3)]">{result.url}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--left)]" />
            <p className="text-sm text-[var(--text3)]">Consulting all eight perspectives…</p>
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--border)] py-6 text-center text-sm text-[var(--text3)]">
        Polarity — Multi-perspective news analysis
      </footer>
    </div>
  );
}
