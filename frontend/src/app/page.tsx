"use client";

import { useState } from "react";
import { PANEL_ORDER } from "@/lib/agents";

type BiasCategory5 = "Far Left" | "Lean Left" | "Center" | "Lean Right" | "Far Right";

type Reply = { agentId: string; name: string; shortName: string; color: string; text: string; summary: string; score: number | null };

type Result = {
  url: string;
  title: string;
  replies: Reply[];
  finalSummary?: string;
  credibilityScore?: number;
  horizontalRank?: number;
  biasCategory?: string;
  biasPosition?: string;
  biasConfidence?: number;
  outletBaseline?: { name: string; verticalRank: number; horizontalRank: number } | null;
};

function PanelReplyCard({ reply }: { reply: Reply }) {
  const [expanded, setExpanded] = useState(false);
  const score = reply.score;
  return (
    <div
      className="overflow-hidden rounded-xl border bg-white shadow-sm"
      style={{ borderColor: reply.color, borderLeftWidth: 4 }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold" style={{ color: reply.color }}>{reply.name}</span>
            {score !== null && (
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: reply.color, color: reply.color }}>
                {score}/10
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text2)] leading-snug line-clamp-2">{reply.summary}</p>
        </div>
        <span className="mt-1 text-[var(--text3)] text-sm flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{reply.text}</p>
        </div>
      )}
    </div>
  );
}

const BIAS_SEGMENTS: { key: BiasCategory5; label: string; segmentBg: string }[] = [
  { key: "Far Left", label: "FAR LEFT", segmentBg: "var(--far-left)" },
  { key: "Lean Left", label: "LEAN LEFT", segmentBg: "var(--left)" },
  { key: "Center", label: "CENTER", segmentBg: "var(--centrist)" },
  { key: "Lean Right", label: "LEAN RIGHT", segmentBg: "var(--right)" },
  { key: "Far Right", label: "FAR RIGHT", segmentBg: "var(--far-right)" },
];

function normalizeBiasCategory(raw: string | undefined): BiasCategory5 {
  const t = (raw ?? "Center").trim();
  if (/far\s*left/i.test(t)) return "Far Left";
  if (/lean\s*left/i.test(t) || /^left$/i.test(t) || /center-left/i.test(t)) return "Lean Left";
  if (/far\s*right/i.test(t)) return "Far Right";
  if (/lean\s*right/i.test(t) || /^right$/i.test(t) || /center-right/i.test(t)) return "Lean Right";
  if (/centrist/i.test(t) || /^center$/i.test(t) || /^centre$/i.test(t)) return "Center";
  return "Center";
}

function horizontalToSliderPercent(h: number): number {
  const clamped = Math.min(42, Math.max(-42, h));
  return ((clamped + 42) / 84) * 100;
}

const LOGO_SVG = (
  <svg width="44" height="44" viewBox="0 0 680 500" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <style>{`
      @keyframes spinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes spinRed  { from { transform: rotate(180deg); } to { transform: rotate(540deg); } }
      .arc-blue  { transform-origin: 340px 215px; animation: spinBlue 2.5s linear infinite; }
      .arc-blue2 { transform-origin: 340px 215px; animation: spinBlue 2.5s linear infinite; animation-delay: -0.2s; }
      .arc-red   { transform-origin: 340px 215px; animation: spinRed  2.5s linear infinite; }
      .arc-red2  { transform-origin: 340px 215px; animation: spinRed  2.5s linear infinite; animation-delay: -0.2s; }
    `}</style>
    <defs>
      <radialGradient id="lgCg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a0c8ff" stopOpacity="0.12"/>
        <stop offset="50%" stopColor="#ff6060" stopOpacity="0.06"/>
        <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="lgBf" cx="40%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="70%" stopColor="#dce8f2"/>
        <stop offset="100%" stopColor="#b8cfe0"/>
      </radialGradient>
    </defs>
    <circle cx="340" cy="215" r="178" fill="url(#lgCg)"/>
    {/* Blue spinning arcs */}
    <g className="arc-blue">
      <path d="M340 37 A178 178 0 0 1 518 215" fill="none" stroke="#1565C0" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
      <path d="M340 62 A153 153 0 0 1 493 215" fill="none" stroke="#1976D2" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
      <path d="M340 90 A125 125 0 0 1 465 215" fill="none" stroke="#42A5F5" strokeWidth="3.5" strokeLinecap="round" opacity=".6"/>
      <path d="M340 112 A103 103 0 0 1 443 215" fill="none" stroke="#90CAF9" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
    </g>
    <g className="arc-blue2">
      <path d="M202 104 A178 178 0 0 0 340 37" fill="none" stroke="#0D47A1" strokeWidth="4.5" strokeLinecap="round" opacity=".5"/>
      <path d="M224 127 A153 153 0 0 0 340 62" fill="none" stroke="#1E88E5" strokeWidth="3" strokeLinecap="round" opacity=".35"/>
    </g>
    {/* Red spinning arcs (opposite direction) */}
    <g className="arc-red">
      <path d="M340 393 A178 178 0 0 1 162 215" fill="none" stroke="#B71C1C" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
      <path d="M340 368 A153 153 0 0 1 187 215" fill="none" stroke="#C62828" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
      <path d="M340 340 A125 125 0 0 1 215 215" fill="none" stroke="#EF5350" strokeWidth="3.5" strokeLinecap="round" opacity=".6"/>
      <path d="M340 318 A103 103 0 0 1 237 215" fill="none" stroke="#EF9A9A" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
    </g>
    <g className="arc-red2">
      <path d="M478 326 A178 178 0 0 0 340 393" fill="none" stroke="#8B0000" strokeWidth="4.5" strokeLinecap="round" opacity=".5"/>
      <path d="M456 303 A153 153 0 0 0 340 368" fill="none" stroke="#D32F2F" strokeWidth="3" strokeLinecap="round" opacity=".35"/>
    </g>
    <circle cx="340" cy="215" r="178" fill="none" stroke="#334" strokeWidth="1" opacity=".14"/>
    {/* Ears */}
    <circle cx="274" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
    <circle cx="274" cy="122" r="18" fill="#d4bfba"/>
    <circle cx="406" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
    <circle cx="406" cy="122" r="18" fill="#d4bfba"/>
    {/* Head */}
    <ellipse cx="340" cy="195" rx="86" ry="80" fill="url(#lgBf)" stroke="#b8cce0" strokeWidth="2"/>
    <ellipse cx="320" cy="158" rx="26" ry="16" fill="white" opacity="0.45"/>
    {/* Eyes */}
    <ellipse cx="305" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
    <ellipse cx="375" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
    <ellipse cx="310" cy="180" rx="5" ry="5" fill="white"/>
    <ellipse cx="380" cy="180" rx="5" ry="5" fill="white"/>
    <circle cx="313" cy="187" r="2" fill="white" opacity="0.6"/>
    <circle cx="383" cy="187" r="2" fill="white" opacity="0.6"/>
    {/* Muzzle */}
    <ellipse cx="340" cy="222" rx="30" ry="23" fill="#d8e8f4" opacity="0.8"/>
    <ellipse cx="340" cy="216" rx="17" ry="12" fill="#1a1a2e"/>
    <ellipse cx="335" cy="212" rx="6" ry="4" fill="#3a3a5e" opacity="0.7"/>
    <line x1="340" y1="228" x2="340" y2="234" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
    <path d="M 326 234 Q 340 248 354 234" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

type PanelMember = (typeof PANEL_ORDER)[number];
function getCharacter(m: PanelMember) {
  const x = m as PanelMember & { characterName?: string; characterTagline?: string; icon?: string };
  return { name: x.characterName ?? m.shortName, tagline: x.characterTagline ?? "", icon: x.icon ?? "•" };
}

export default function Home() {
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let payload: { url: string; title: string; description: string; body: string };

      if (inputMode === "text") {
        const body = articleText.trim();
        if (!body) {
          setError("Paste some article text to analyze.");
          setLoading(false);
          return;
        }
        payload = {
          url: "paste://article",
          title: pastedTitle.trim() || "Pasted article",
          description: "",
          body,
        };
      } else {
        if (!url.trim()) {
          setError("Enter a URL or switch to Paste Article Text.");
          setLoading(false);
          return;
        }
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
        payload = {
          url: fetchData.url,
          title: fetchData.title,
          description: fetchData.description,
          body: fetchData.body,
        };
      }

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const horizontal = result?.horizontalRank ?? 0;
  const biasCategory = result
    ? normalizeBiasCategory(result.biasCategory ?? result.biasPosition)
    : "Center";
  const biasSliderPct = result ? horizontalToSliderPercent(horizontal) : 50;
  const cred = result?.credibilityScore ?? 0;
  const reliability64 = Math.round((cred / 100) * 64);
  const neutralityPct = Math.round(100 - Math.min(100, (Math.abs(horizontal) / 42) * 40));
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
          <span className="text-sm font-medium text-[var(--text2)]">6-Panel AI Analysis</span>
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
              <div className="flex justify-center mb-6">
                <svg width="160" height="118" viewBox="0 0 680 500" xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    @keyframes heroSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes heroSpinRed  { from { transform: rotate(180deg); } to { transform: rotate(540deg); } }
                    .harc-blue  { transform-origin: 340px 215px; animation: heroSpinBlue 2.5s linear infinite; }
                    .harc-blue2 { transform-origin: 340px 215px; animation: heroSpinBlue 2.5s linear infinite; animation-delay: -0.2s; }
                    .harc-red   { transform-origin: 340px 215px; animation: heroSpinRed  2.5s linear infinite; }
                    .harc-red2  { transform-origin: 340px 215px; animation: heroSpinRed  2.5s linear infinite; animation-delay: -0.2s; }
                  `}</style>
                  <defs>
                    <radialGradient id="hCg" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#a0c8ff" stopOpacity="0.12"/>
                      <stop offset="50%" stopColor="#ff6060" stopOpacity="0.06"/>
                      <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="hBf" cx="40%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="#ffffff"/>
                      <stop offset="70%" stopColor="#dce8f2"/>
                      <stop offset="100%" stopColor="#b8cfe0"/>
                    </radialGradient>
                  </defs>
                  <circle cx="340" cy="215" r="178" fill="url(#hCg)"/>
                  <g className="harc-blue">
                    <path d="M340 37 A178 178 0 0 1 518 215" fill="none" stroke="#1565C0" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
                    <path d="M340 62 A153 153 0 0 1 493 215" fill="none" stroke="#1976D2" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
                    <path d="M340 90 A125 125 0 0 1 465 215" fill="none" stroke="#42A5F5" strokeWidth="3.5" strokeLinecap="round" opacity=".6"/>
                    <path d="M340 112 A103 103 0 0 1 443 215" fill="none" stroke="#90CAF9" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
                  </g>
                  <g className="harc-blue2">
                    <path d="M202 104 A178 178 0 0 0 340 37" fill="none" stroke="#0D47A1" strokeWidth="4.5" strokeLinecap="round" opacity=".5"/>
                    <path d="M224 127 A153 153 0 0 0 340 62" fill="none" stroke="#1E88E5" strokeWidth="3" strokeLinecap="round" opacity=".35"/>
                  </g>
                  <g className="harc-red">
                    <path d="M340 393 A178 178 0 0 1 162 215" fill="none" stroke="#B71C1C" strokeWidth="7" strokeLinecap="round" opacity=".9"/>
                    <path d="M340 368 A153 153 0 0 1 187 215" fill="none" stroke="#C62828" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
                    <path d="M340 340 A125 125 0 0 1 215 215" fill="none" stroke="#EF5350" strokeWidth="3.5" strokeLinecap="round" opacity=".6"/>
                    <path d="M340 318 A103 103 0 0 1 237 215" fill="none" stroke="#EF9A9A" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
                  </g>
                  <g className="harc-red2">
                    <path d="M478 326 A178 178 0 0 0 340 393" fill="none" stroke="#8B0000" strokeWidth="4.5" strokeLinecap="round" opacity=".5"/>
                    <path d="M456 303 A153 153 0 0 0 340 368" fill="none" stroke="#D32F2F" strokeWidth="3" strokeLinecap="round" opacity=".35"/>
                  </g>
                  <circle cx="340" cy="215" r="178" fill="none" stroke="#334" strokeWidth="1" opacity=".14"/>
                  <circle cx="274" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
                  <circle cx="274" cy="122" r="18" fill="#d4bfba"/>
                  <circle cx="406" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
                  <circle cx="406" cy="122" r="18" fill="#d4bfba"/>
                  <ellipse cx="340" cy="195" rx="86" ry="80" fill="url(#hBf)" stroke="#b8cce0" strokeWidth="2"/>
                  <ellipse cx="320" cy="158" rx="26" ry="16" fill="white" opacity="0.45"/>
                  <ellipse cx="305" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
                  <ellipse cx="375" cy="186" rx="13" ry="14" fill="#1a1a2e"/>
                  <ellipse cx="310" cy="180" rx="5" ry="5" fill="white"/>
                  <ellipse cx="380" cy="180" rx="5" ry="5" fill="white"/>
                  <circle cx="313" cy="187" r="2" fill="white" opacity="0.6"/>
                  <circle cx="383" cy="187" r="2" fill="white" opacity="0.6"/>
                  <ellipse cx="340" cy="222" rx="30" ry="23" fill="#d8e8f4" opacity="0.8"/>
                  <ellipse cx="340" cy="216" rx="17" ry="12" fill="#1a1a2e"/>
                  <ellipse cx="335" cy="212" rx="6" ry="4" fill="#3a3a5e" opacity="0.7"/>
                  <line x1="340" y1="228" x2="340" y2="234" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M 326 234 Q 340 248 354 234" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
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
                Polarity evaluates news articles across the political spectrum using a Host and five AI panelists — each representing a distinct perspective — combined with Ad Fontes outlet data, and synthesizes reliability and left–right placement.
              </p>
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm text-[var(--text2)]">
                <span>Far Left</span><span className="text-[var(--text3)]">·</span>
                <span>Lean Left</span><span className="text-[var(--text3)]">·</span>
                <span>Center</span><span className="text-[var(--text3)]">·</span>
                <span>Lean Right</span><span className="text-[var(--text3)]">·</span>
                <span>Far Right</span><span className="text-[var(--text3)]">·</span>
                <span>Multi-Agent Analysis</span>
              </div>
            </div>

            {/* Panel: who debates */}
            <div className="mb-10 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Who debates your article
              </h2>
              <p className="mb-4 text-sm text-[var(--text2)]">
                A Host sets the topic, then five AI panelists give their view in order. Scores blend Ad Fontes chart baselines with article-level analysis.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PANEL_ORDER.map((member) => {
                  const { name, tagline } = getCharacter(member);
                  const isHost = member.id === "facilitator";
                  return (
                    <div
                      key={member.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2"
                      style={{ borderLeftWidth: 3, borderLeftColor: member.color }}
                    >
                      <div className="text-sm font-semibold text-[var(--text)]">{name}</div>
                      <div className="text-xs text-[var(--text2)]">
                        {isHost ? "Keeps the discussion on topic." : tagline}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input card - Image 1 style */}
            <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
              <div className="flex border-b border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={`relative px-5 py-3.5 text-sm font-medium ${
                    inputMode === "text"
                      ? "border-b-2 border-[var(--text)] bg-[var(--surface2)] text-[var(--text)]"
                      : "text-[var(--text3)] hover:text-[var(--text2)]"
                  }`}
                >
                  Paste Article Text
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("url")}
                  className={`relative px-5 py-3.5 text-sm font-medium ${
                    inputMode === "url"
                      ? "border-b-2 border-[var(--text)] bg-[var(--surface2)] text-[var(--text)]"
                      : "text-[var(--text3)] hover:text-[var(--text2)]"
                  }`}
                >
                  Paste URL
                </button>
              </div>
              <div className="border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-2.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--text3)]">
                  {inputMode === "url" ? "Article URL" : "Article text"}
                </span>
              </div>
              <div className="p-5">
                {inputMode === "url" ? (
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                    disabled={loading}
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="Optional headline / title"
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                      disabled={loading}
                    />
                    <textarea
                      value={articleText}
                      onChange={(e) => setArticleText(e.target.value)}
                      placeholder="Paste the full article text here (several paragraphs work best)…"
                      rows={12}
                      className="min-h-[200px] w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                      disabled={loading}
                    />
                  </div>
                )}
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
                Political Bias — Left / Right Spectrum
              </h2>
              <div className="mb-2 flex overflow-hidden rounded-lg border border-[var(--border)]">
                {BIAS_SEGMENTS.map((seg) => {
                  const active = seg.key === biasCategory;
                  return (
                    <div
                      key={seg.key}
                      className={`flex-1 py-2.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-white sm:text-[10px] ${active ? "ring-2 ring-inset ring-[var(--text)]" : ""}`}
                      style={{
                        background: seg.segmentBg,
                        color: seg.key === "Center" ? "white" : "rgba(255,255,255,0.95)",
                      }}
                    >
                      {seg.label.split(" ").join("\n")}
                    </div>
                  );
                })}
              </div>
              <div
                className="relative mb-2 h-2.5 w-full overflow-visible rounded-full"
                style={{
                  background: "linear-gradient(to right, var(--bias-deep-left) 0%, var(--bias-center) 50%, var(--bias-deep-right) 100%)",
                }}
              >
                <div
                  className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--text)] bg-white shadow-md transition-all duration-500"
                  style={{ left: `${Math.min(100, Math.max(0, biasSliderPct))}%` }}
                />
              </div>
              <div className="mb-3 flex justify-between gap-0.5 text-[9px] text-[var(--text3)] sm:text-[10px]">
                <span className="flex-1 text-center">Far Left</span>
                <span className="flex-1 text-center">Lean Left</span>
                <span className="flex-1 text-center">Center</span>
                <span className="flex-1 text-center">Lean Right</span>
                <span className="flex-1 text-center">Far Right</span>
              </div>
              <div className="text-center">
                <div
                  className="font-display text-3xl font-normal md:text-4xl"
                  style={{
                    fontFamily: "var(--font-display)",
                    color:
                      biasCategory === "Far Left" || biasCategory === "Lean Left"
                        ? "var(--bias-deep-left)"
                        : biasCategory === "Far Right" || biasCategory === "Lean Right"
                          ? "var(--bias-deep-right)"
                          : "var(--centrist)",
                  }}
                >
                  {biasCategory}
                </div>
                <div className="mt-2 text-sm text-[var(--text3)]">
                  {result.biasConfidence != null ? `${result.biasConfidence}% confident` : "—"} · Ad Fontes horizontal blend (left ↔ right)
                </div>
                {result?.outletBaseline && (
                  <p className="mt-2 text-xs text-[var(--text2)]">
                    Outlet baseline: {result.outletBaseline.name} (chart ranks V{result.outletBaseline.verticalRank} / H{result.outletBaseline.horizontalRank})
                  </p>
                )}
              </div>
            </div>

            {/* Four summary cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { title: "Reliability", score: `${cred}/100`, desc: cred >= 71 ? "Higher reliability" : cred >= 41 ? "Moderate" : "Use caution", color: cred >= 71 ? "var(--green-light)" : cred >= 41 ? "var(--orange)" : "var(--red-warn)", pct: cred },
                {
                  title: "Bias placement",
                  score: biasCategory,
                  desc: "Left–right spectrum",
                  color:
                    horizontal < 0
                      ? "var(--bias-deep-left)"
                      : horizontal > 0
                        ? "var(--bias-deep-right)"
                        : "var(--centrist)",
                  pct: biasSliderPct,
                },
                { title: "Neutrality Index", score: `${neutralityPct}%`, desc: "Balanced", color: "var(--green-light)", pct: neutralityPct },
                { title: "Factual Expression", score: `${factualPct}%`, desc: "Reporting vs opinion", color: "var(--green-light)", pct: factualPct },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{card.title}</div>
                  <div
                    className={`font-bold ${card.title === "Bias placement" ? "text-xl leading-tight sm:text-2xl" : "text-2xl"}`}
                    style={{ color: card.color }}
                  >
                    {card.score}
                  </div>
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
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Synthesis from Host and five panelists</li>
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
              {result.url.startsWith("paste://") ? (
                <>
                  <p className="font-semibold text-[var(--text)]">Pasted article</p>
                  <p className="mt-1 text-sm text-[var(--text3)]">No URL — analysis used your pasted text only.</p>
                </>
              ) : (
                <>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--accent-blue)] underline hover:no-underline"
                  >
                    Open article →
                  </a>
                  <p className="mt-1 truncate text-sm text-[var(--text3)]">{result.url}</p>
                </>
              )}
            </div>

            {/* Panel Replies */}
            {result.replies && result.replies.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">
                  Panel Discussion — {result.replies.length} Analysts
                </h3>
                {result.replies.map((reply) => (
                  <PanelReplyCard key={reply.agentId} reply={reply} />
                ))}
              </div>
            )}

            {/* Analyze another */}
            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={() => setResult(null)}
                className="rounded-xl border border-[var(--border)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--text2)] shadow-sm hover:bg-[var(--surface2)] hover:text-[var(--text)]"
              >
                ← Analyze another article
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--left)]" />
            <p className="mb-4 text-sm font-semibold text-[var(--text)]">Running 6-panel AI analysis…</p>
            <div className="mx-auto max-w-xs space-y-2">
              {PANEL_ORDER.map((member, i) => {
                const char = (member as { characterName?: string; icon?: string });
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg bg-[var(--surface2)] px-3 py-2">
                    <span>{char.icon ?? "•"}</span>
                    <span className="text-sm text-[var(--text2)]">{member.id === "facilitator" ? "Host setting the topic…" : `${char.characterName ?? member.shortName} analyzing…`}</span>
                    <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: member.color }} />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-[var(--text3)]">This takes 20–60 seconds — each panelist reads the full article.</p>
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
