"use client";

import { useState, useCallback } from "react";
import { PANEL_ORDER } from "@/lib/agents";

type BiasCategory5 = "Far Left" | "Lean Left" | "Center" | "Lean Right" | "Far Right";

type Reply = { agentId: string; name: string; shortName: string; color: string; text: string; summary: string; score: number | null; keywords?: string[] };

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
  politicalNeutrality?: number | null;
  languageNeutrality?: number | null;
  coverageBalance?: number | null;
  outletBaseline?: { name: string; verticalRank: number; horizontalRank: number } | null;
};

type FactSource = { title: string; summary: string; url: string };
type FactClaim = { claim: string; verdict: string; sources: FactSource[] };

const KNOWN_DOMAINS: Record<string, string> = {
  "reuters": "https://www.reuters.com",
  "ap news": "https://apnews.com",
  "associated press": "https://apnews.com",
  "bbc": "https://www.bbc.com/news",
  "bbc news": "https://www.bbc.com/news",
  "the new york times": "https://www.nytimes.com",
  "new york times": "https://www.nytimes.com",
  "nyt": "https://www.nytimes.com",
  "the washington post": "https://www.washingtonpost.com",
  "washington post": "https://www.washingtonpost.com",
  "the guardian": "https://www.theguardian.com",
  "guardian": "https://www.theguardian.com",
  "npr": "https://www.npr.org",
  "cnn": "https://www.cnn.com",
  "fox news": "https://www.foxnews.com",
  "msnbc": "https://www.msnbc.com",
  "the wall street journal": "https://www.wsj.com",
  "wall street journal": "https://www.wsj.com",
  "wsj": "https://www.wsj.com",
  "politico": "https://www.politico.com",
  "the hill": "https://thehill.com",
  "axios": "https://www.axios.com",
  "bloomberg": "https://www.bloomberg.com",
  "time": "https://time.com",
  "newsweek": "https://www.newsweek.com",
  "usa today": "https://www.usatoday.com",
  "the atlantic": "https://www.theatlantic.com",
  "vox": "https://www.vox.com",
  "propublica": "https://www.propublica.org",
  "snopes": "https://www.snopes.com",
  "politifact": "https://www.politifact.com",
  "factcheck.org": "https://www.factcheck.org",
  "cdc": "https://www.cdc.gov",
  "who": "https://www.who.int",
  "fbi": "https://www.fbi.gov",
  "doj": "https://www.justice.gov",
  "white house": "https://www.whitehouse.gov",
};

function resolveSourceUrl(title: string, rawUrl: string): string {
  if (rawUrl && rawUrl.startsWith("http")) return rawUrl;
  const key = title.trim().toLowerCase();
  return KNOWN_DOMAINS[key] ?? `https://www.${title.trim().toLowerCase().replace(/\s+/g, "")}.com`;
}

function parseFactClaims(text: string): FactClaim[] {
  const claims: FactClaim[] = [];
  const blocks = text.split(/(?=CLAIM:)/i).filter((b) => /CLAIM:/i.test(b));
  for (const block of blocks) {
    const claim = block.match(/CLAIM:\s*([\s\S]+?)(?=\nVERDICT:|$)/i)?.[1]?.trim() ?? "";
    const verdict = block.match(/VERDICT:\s*([\s\S]+?)(?=\nSOURCE:|\nCLAIM:|$)/i)?.[1]?.trim() ?? "";
    const sourceLines = [...block.matchAll(/^SOURCE:\s*(.+)$/gim)];
    const sources: FactSource[] = sourceLines.map((m) => {
      const parts = m[1].split("|").map((p) => p.trim());
      const title = parts[0];
      const maybeUrl = parts[1] ?? "";
      const summary = maybeUrl.startsWith("http") ? (parts[2] ?? "") : (parts[1] ?? "");
      const url = resolveSourceUrl(title, maybeUrl);
      return { title, summary, url };
    });
    if (claim) claims.push({ claim, verdict, sources });
  }
  return claims;
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode[] {
  if (!keywords.length) return [text];
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ background: "rgba(180,83,9,0.18)", color: "var(--bias)", borderRadius: "3px", padding: "0 2px", fontWeight: 600 }}>{part}</mark>
      : part
  );
}

const VERDICT_STYLES: Record<string, { color: string; bg: string }> = {
  supported:  { color: "var(--green)",    bg: "rgba(21,128,61,0.08)" },
  unverified: { color: "var(--orange)",   bg: "rgba(234,88,12,0.08)" },
  disputed:   { color: "var(--red-warn)", bg: "rgba(220,38,38,0.08)" },
};

function verdictStyle(verdict: string) {
  return VERDICT_STYLES[verdict.toLowerCase()] ?? VERDICT_STYLES.unverified;
}

function PanelReplyCard({ reply }: { reply: Reply }) {
  const [expanded, setExpanded] = useState(false);
  const score = reply.score;
  const isFactChecker = reply.agentId === "factchecker";
  const isBias = reply.agentId === "bias";
  const isSynthesizer = reply.agentId === "synthesizer";
  const claims = isFactChecker ? parseFactClaims(reply.text) : [];
  const keywords = reply.keywords ?? [];

  return (
    <div
      className="overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm"
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
          {isFactChecker && claims.length > 0 ? (
            <div className="space-y-3">
              {claims.map((c, i) => {
                const vs = verdictStyle(c.verdict);
                return (
                  <div key={i} className="rounded-lg border border-[var(--border)] p-3" style={{ background: vs.bg }}>
                    <p className="mb-1.5 text-[13px] font-medium text-[var(--text)]">{c.claim}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: vs.color, background: "var(--surface)" }}>
                        {c.verdict}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">Sources</p>
                      {c.sources.length === 0 ? (
                        <p className="text-[12px] text-[var(--text3)]">No reliable sources found</p>
                      ) : (
                        <ul className="space-y-2">
                          {c.sources.map((s, j) => (
                            <li key={j}>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[13px] font-medium underline decoration-dotted underline-offset-2 hover:no-underline"
                                style={{ color: "var(--accent-blue)" }}
                              >
                                {s.title}
                              </a>
                              {s.summary && (
                                <p className="mt-0.5 text-[12px] leading-snug text-[var(--text2)]">{s.summary}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (isBias || isSynthesizer) && keywords.length > 0 ? (
            <div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{highlightKeywords(reply.text, keywords)}</p>
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{isBias ? "Flagged language" : "Key phrases"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span key={i} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `color-mix(in srgb, ${reply.color} 12%, transparent)`, color: reply.color }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{reply.text}</p>
          )}
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

type PanelMember = (typeof PANEL_ORDER)[number];
function getCharacter(m: PanelMember) {
  const x = m as PanelMember & { characterName?: string; characterTagline?: string; icon?: string };
  return { name: x.characterName ?? m.shortName, tagline: x.characterTagline ?? "", icon: x.icon ?? "•" };
}

export default function Home() {
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [showSources, setShowSources] = useState(false);
  const [url, setUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<"yes" | "no" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackDone(false);
    setFeedbackErr(null);
    setFeedbackSubmitting(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    resetFeedback();
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
  void reliability64; // used in Ad Fontes factors below
  const politicalNeutralityPct = result?.politicalNeutrality ?? Math.round(100 - (Math.abs(horizontal) / 42) * 100);
  const languageNeutralityPct = result?.languageNeutrality ?? Math.round(100 - (Math.abs(horizontal) / 42) * 100);
  const coverageBalancePct = result?.coverageBalance ?? Math.round(100 - (Math.abs(horizontal) / 42) * 100);
  const neutralityPct = Math.round((politicalNeutralityPct + languageNeutralityPct + coverageBalancePct) / 3);
  const factualPct = Math.round(cred * 0.85);
  const factualLabel = factualPct >= 75 ? "Reporting" : factualPct >= 50 ? "Mostly Reporting" : factualPct >= 35 ? "Mixed" : factualPct >= 15 ? "Mostly Opinion" : "Opinion";
  const factualColor = factualPct >= 75 ? "var(--green)" : factualPct >= 50 ? "var(--green-light)" : factualPct >= 35 ? "var(--orange)" : "var(--red-warn)";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={{ fontFamily: "var(--font-body)" }}>
      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        {!result ? (
          <>
            {/* Hero - Image 1 style */}
            <div className="mb-10">
              <div className="flex justify-center mb-6">
                <svg width="160" height="118" viewBox="0 0 680 500" xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    @keyframes hSpinBlue { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
                    @keyframes hSpinRed  { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
                    .hspin-blue { transform-origin: 340px 215px; animation: hSpinBlue 2.5s linear infinite; }
                    .hspin-red  { transform-origin: 340px 215px; animation: hSpinRed  2.5s linear infinite; }
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
                  <g className="hspin-blue">
                    <circle cx="340" cy="215" r="178" fill="none" stroke="#1565C0" strokeWidth="7"   strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
                    <circle cx="340" cy="215" r="153" fill="none" stroke="#1976D2" strokeWidth="5"   strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
                    <circle cx="340" cy="215" r="125" fill="none" stroke="#42A5F5" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
                    <circle cx="340" cy="215" r="103" fill="none" stroke="#90CAF9" strokeWidth="2"   strokeLinecap="round" strokeDasharray="162 485" opacity=".5"/>
                  </g>
                  <g className="hspin-blue" style={{ animationDelay: "-0.4s" }}>
                    <circle cx="340" cy="215" r="178" fill="none" stroke="#0D47A1" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="140 840" opacity=".5"/>
                    <circle cx="340" cy="215" r="153" fill="none" stroke="#1E88E5" strokeWidth="3"   strokeLinecap="round" strokeDasharray="120 721" opacity=".35"/>
                  </g>
                  <g className="hspin-red">
                    <circle cx="340" cy="215" r="178" fill="none" stroke="#B71C1C" strokeWidth="7"   strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
                    <circle cx="340" cy="215" r="153" fill="none" stroke="#C62828" strokeWidth="5"   strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
                    <circle cx="340" cy="215" r="125" fill="none" stroke="#EF5350" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
                    <circle cx="340" cy="215" r="103" fill="none" stroke="#EF9A9A" strokeWidth="2"   strokeLinecap="round" strokeDasharray="162 485" opacity=".5"/>
                  </g>
                  <g className="hspin-red" style={{ animationDelay: "-0.4s" }}>
                    <circle cx="340" cy="215" r="178" fill="none" stroke="#8B0000" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="140 840" opacity=".5"/>
                    <circle cx="340" cy="215" r="153" fill="none" stroke="#D32F2F" strokeWidth="3"   strokeLinecap="round" strokeDasharray="120 721" opacity=".35"/>
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
                Where does your source{" "}
                <span style={{ background: "linear-gradient(90deg, var(--accent-blue), var(--accent-red))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>actually</span>{" "}
                <span style={{ background: "linear-gradient(90deg, var(--accent-blue), var(--accent-red))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>stand?</span>
              </h1>
              <p className="mb-6 max-w-xl text-[15px] leading-relaxed text-[var(--text2)]">
                Polarity evaluates news articles across the political spectrum using a Host and five AI panelists — each representing a distinct perspective — combined with Ad Fontes outlet data, and synthesizes reliability and left–right placement.
              </p>

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
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                    disabled={loading}
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="Optional headline / title"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                      disabled={loading}
                    />
                    <textarea
                      value={articleText}
                      onChange={(e) => setArticleText(e.target.value)}
                      placeholder="Paste the full article text here (several paragraphs work best)…"
                      rows={12}
                      className="min-h-[200px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface2)] px-5 py-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[var(--accent-blue)] px-8 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Analyzing…" : "Analyze"}
                </button>
              </div>
            </form>

            {/* Agent info section */}
            <div className="mt-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-widest text-[var(--text3)]">Meet the analysts</span>
                <span className="flex-1 border-t border-[var(--border)]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {PANEL_ORDER.map((agent) => (
                  <div key={agent.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5" style={{ borderLeftWidth: 3, borderLeftColor: agent.color }}>
                    <div className="mb-2 flex items-center gap-2">
                      {agent.icon && <span className="text-lg">{agent.icon}</span>}
                      <div>
                        <p className="text-sm font-bold" style={{ color: agent.color }}>{agent.name}</p>
                        <p className="text-[11px] text-[var(--text3)]">{agent.characterTagline}</p>
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed text-[var(--text2)]">
                      {agent.id === "bias" && "Scans the article for loaded language, selective framing, and emotionally manipulative wording — with specific examples pulled directly from the text."}
                      {agent.id === "factchecker" && "Extracts 3–5 specific claims (stats, quotes, events) and assesses whether each is well-sourced, unverified, or disputed, with linked sources."}
                      {agent.id === "synthesizer" && "Weighs everything together for a balanced final verdict — what the article does well, where it falls short, and an overall reliability score."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Results - Image 2 Ad Fontes dashboard */
          <div className="space-y-8">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
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
                  className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--text)] bg-[var(--surface)] shadow-md transition-all duration-500"
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
                { title: "Factual Expression", score: factualLabel, desc: "Reporting vs opinion", color: factualColor, pct: factualPct },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{card.title}</div>
                  <div
                    className={`font-bold ${card.title === "Bias placement" || card.title === "Factual Expression" ? "text-xl leading-tight sm:text-2xl" : "text-2xl"}`}
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
            <div className="space-y-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Ad Fontes Factors</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <ul className="space-y-3">
                    {[
                      { label: "Expression / Reporting", pct: factualPct },
                      { label: "Veracity / Accuracy", pct: Math.min(95, reliability64 + 10) },
                      { label: "Headline Accuracy", pct: Math.min(90, cred) },
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
                  <ul className="space-y-3">
                    {[
                      { label: "Political Neutrality", pct: politicalNeutralityPct },
                      { label: "Language Neutrality", pct: languageNeutralityPct },
                      { label: "Coverage Balance", pct: coverageBalancePct },
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
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--red-warn)]">Watch Out For</h3>
                  <ul className="space-y-2 text-sm text-[var(--text2)]">
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Headlines that provoke strong emotion may distort the actual story</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Anonymous or unnamed sources can't be independently verified</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Opinion framed as fact — watch for words like "clearly" or "obviously"</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--red-warn)]" />Stories that only quote one side of an issue</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--green)]">Keep in Mind</h3>
                  <ul className="space-y-2 text-sm text-[var(--text2)]">
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Every outlet has a perspective — cross-reference with other sources</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Bias and accuracy are separate — a biased article can still be factual</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Absence of a claim doesn't mean it's false — it may simply be omitted</li>
                    <li className="flex gap-2"><span className="block h-4 w-0.5 shrink-0 bg-[var(--green)]" />Primary sources (data, official statements) carry more weight than summaries</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Summary + source */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Summary</h3>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text)]">
                {result.finalSummary || "No summary available."}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
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
                  Analyst Reports — {result.replies.length} perspectives
                </h3>
                {result.replies.map((reply) => (
                  <PanelReplyCard key={reply.agentId} reply={reply} />
                ))}
              </div>
            )}

            {/* View Sources */}
            <div>
              <button
                onClick={() => setShowSources((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm font-medium text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)] transition-colors"
              >
                <span>View Sources</span>
                <span className="text-[var(--text3)]">{showSources ? "▲" : "▼"}</span>
              </button>
              {showSources && (() => {
                const factReply = result.replies.find((r) => r.agentId === "factchecker");
                const allSources = factReply
                  ? parseFactClaims(factReply.text).flatMap((c) => c.sources)
                  : [];
                const unique = allSources.filter((s, i, arr) => arr.findIndex((x) => x.title === s.title) === i);
                return (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-5 text-sm">
                    {unique.length === 0 ? (
                      <p className="text-[var(--text3)]">No sources found.</p>
                    ) : (
                      <ul className="space-y-3">
                        {unique.map((s, i) => (
                          <li key={i}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline decoration-dotted underline-offset-2 hover:no-underline"
                              style={{ color: "var(--accent-blue)" }}
                            >
                              {s.title}
                            </a>
                            {s.summary && <p className="mt-0.5 text-[12px] leading-snug text-[var(--text2)]">{s.summary}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Feedback */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              {feedbackDone ? (
                <p className="text-center text-sm font-medium text-[var(--green)]">
                  Your feedback has been sent. Thank you.
                </p>
              ) : (
                <>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Was this analysis helpful?
                  </h3>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackRating("yes");
                        setFeedbackErr(null);
                      }}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        feedbackRating === "yes"
                          ? "border-[var(--green)] bg-[var(--surface2)] text-[var(--green)] ring-2 ring-[var(--green)] ring-offset-2 ring-offset-[var(--surface)]"
                          : "border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        👍
                      </span>
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackRating("no");
                        setFeedbackErr(null);
                      }}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        feedbackRating === "no"
                          ? "border-[var(--accent-red)] bg-[var(--surface2)] text-[var(--accent-red)] ring-2 ring-[var(--accent-red)] ring-offset-2 ring-offset-[var(--surface)]"
                          : "border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        👎
                      </span>
                      No
                    </button>
                  </div>
                  {feedbackRating && (
                    <div className="mt-4 space-y-3">
                      <label htmlFor="feedback-comment" className="block text-xs font-medium text-[var(--text3)]">
                        Optional comment
                      </label>
                      <textarea
                        id="feedback-comment"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Tell us what worked or what we could improve…"
                        rows={3}
                        disabled={feedbackSubmitting}
                        className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:outline-none focus:ring-2 focus:ring-[var(--border)] disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={feedbackSubmitting}
                        onClick={async () => {
                          if (!feedbackRating || !result) return;
                          setFeedbackSubmitting(true);
                          setFeedbackErr(null);
                          try {
                            const res = await fetch("/api/feedback", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                url: result.url,
                                title: result.title,
                                rating: feedbackRating,
                                comment: feedbackComment.trim() || undefined,
                              }),
                            });
                            const data = (await res.json()) as {
                              ok?: boolean;
                              error?: string;
                            };
                            if (!res.ok) {
                              throw new Error(
                                data.error ||
                                  "We couldn’t save your feedback. Please try again."
                              );
                            }
                            if (data.ok !== true) {
                              throw new Error("We couldn’t save your feedback. Please try again.");
                            }
                            setFeedbackDone(true);
                          } catch (e) {
                            setFeedbackErr(
                              e instanceof Error
                                ? e.message
                                : "We couldn’t save your feedback. Please try again."
                            );
                          } finally {
                            setFeedbackSubmitting(false);
                          }
                        }}
                        className="w-full rounded-xl bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
                      >
                        {feedbackSubmitting ? "Submitting…" : "Submit feedback"}
                      </button>
                    </div>
                  )}
                  {feedbackErr && (
                    <p className="mt-3 text-sm text-[var(--red-warn)]">{feedbackErr}</p>
                  )}
                </>
              )}
            </div>

            {/* Analyze another */}
            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={() => {
                  setResult(null);
                  setShowSources(false);
                  resetFeedback();
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-medium text-[var(--text2)] shadow-sm hover:bg-[var(--surface2)] hover:text-[var(--text)]"
              >
                ← Analyze another article
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <div className="flex justify-center mb-6">
              <svg width="160" height="118" viewBox="0 0 680 500" xmlns="http://www.w3.org/2000/svg">
                <style>{`
                  @keyframes loadSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  @keyframes loadSpinRed  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                  @keyframes bearBob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                  .lspin-blue { transform-origin: 340px 215px; animation: loadSpinBlue 1.5s linear infinite; }
                  .lspin-red  { transform-origin: 340px 215px; animation: loadSpinRed  1.5s linear infinite; }
                  .bear-bob   { transform-origin: 340px 215px; animation: bearBob 1.5s ease-in-out infinite; }
                `}</style>
                <defs>
                  <radialGradient id="lCg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#a0c8ff" stopOpacity="0.15"/>
                    <stop offset="50%" stopColor="#ff6060" stopOpacity="0.08"/>
                    <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="lBf" cx="40%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="70%" stopColor="#dce8f2"/>
                    <stop offset="100%" stopColor="#b8cfe0"/>
                  </radialGradient>
                </defs>
                <circle cx="340" cy="215" r="178" fill="url(#lCg)"/>
                <g className="lspin-blue">
                  <circle cx="340" cy="215" r="178" fill="none" stroke="#1565C0" strokeWidth="7"   strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
                  <circle cx="340" cy="215" r="153" fill="none" stroke="#1976D2" strokeWidth="5"   strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
                  <circle cx="340" cy="215" r="125" fill="none" stroke="#42A5F5" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
                  <circle cx="340" cy="215" r="103" fill="none" stroke="#90CAF9" strokeWidth="2"   strokeLinecap="round" strokeDasharray="162 485" opacity=".5"/>
                </g>
                <g className="lspin-blue" style={{ animationDelay: "-0.4s" }}>
                  <circle cx="340" cy="215" r="178" fill="none" stroke="#0D47A1" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="140 840" opacity=".5"/>
                  <circle cx="340" cy="215" r="153" fill="none" stroke="#1E88E5" strokeWidth="3"   strokeLinecap="round" strokeDasharray="120 721" opacity=".35"/>
                </g>
                <g className="lspin-red">
                  <circle cx="340" cy="215" r="178" fill="none" stroke="#B71C1C" strokeWidth="7"   strokeLinecap="round" strokeDasharray="280 840" opacity=".9"/>
                  <circle cx="340" cy="215" r="153" fill="none" stroke="#C62828" strokeWidth="5"   strokeLinecap="round" strokeDasharray="240 721" opacity=".7"/>
                  <circle cx="340" cy="215" r="125" fill="none" stroke="#EF5350" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="196 589" opacity=".6"/>
                  <circle cx="340" cy="215" r="103" fill="none" stroke="#EF9A9A" strokeWidth="2"   strokeLinecap="round" strokeDasharray="162 485" opacity=".5"/>
                </g>
                <g className="lspin-red" style={{ animationDelay: "-0.4s" }}>
                  <circle cx="340" cy="215" r="178" fill="none" stroke="#8B0000" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="140 840" opacity=".5"/>
                  <circle cx="340" cy="215" r="153" fill="none" stroke="#D32F2F" strokeWidth="3"   strokeLinecap="round" strokeDasharray="120 721" opacity=".35"/>
                </g>
                <circle cx="340" cy="215" r="178" fill="none" stroke="#334" strokeWidth="1" opacity=".14"/>
                <g className="bear-bob">
                  <circle cx="274" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
                  <circle cx="274" cy="122" r="18" fill="#d4bfba"/>
                  <circle cx="406" cy="122" r="30" fill="#e0ecf6" stroke="#b0c4d8" strokeWidth="1.5"/>
                  <circle cx="406" cy="122" r="18" fill="#d4bfba"/>
                  <ellipse cx="340" cy="195" rx="86" ry="80" fill="url(#lBf)" stroke="#b8cce0" strokeWidth="2"/>
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
                </g>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Analyzing article…</p>
            <p className="text-xs text-[var(--text3)]">This takes about 15–20 seconds</p>
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--border)] py-6 text-center text-sm text-[var(--text3)]">
        <p>Polarity — Multi-perspective news analysis</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Polarity. All rights reserved.</p>
      </footer>
    </div>
  );
}