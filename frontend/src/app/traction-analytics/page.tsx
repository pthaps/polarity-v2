"use client";

import { useEffect, useState } from "react";

type TractionData = {
  totalAnalyses: number;
  totalFeedback: number;
  positiveRate: number | null;
  recentAnalyses: { url: string; title: string; created_at: string }[];
};

export default function TractionAnalyticsPage() {
  const [data, setData] = useState<TractionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/traction")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load analytics."));
  }, []);

  const kpis = data
    ? [
        { label: "Total Analyses", value: data.totalAnalyses.toLocaleString(), desc: "Articles analyzed" },
        { label: "Feedback Submissions", value: data.totalFeedback.toLocaleString(), desc: "User ratings received" },
        {
          label: "Positive Rating",
          value: data.positiveRate !== null ? `${data.positiveRate}%` : "—",
          desc: "Users who found it accurate",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Traction Analytics</h1>
          <p className="text-[var(--text2)] text-sm">Key performance indicators for Polarity.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--red-warn)]">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="text-sm text-[var(--text3)]">Loading...</div>
        )}

        {data && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">{kpi.label}</div>
                  <div className="text-3xl font-bold" style={{ color: "var(--accent-blue)" }}>{kpi.value}</div>
                  <div className="text-xs text-[var(--text2)] mt-1">{kpi.desc}</div>
                </div>
              ))}
            </div>

            {/* Recent analyses */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] mb-4">Recent Analyses</h2>
              {data.recentAnalyses.length === 0 ? (
                <p className="text-sm text-[var(--text3)]">No analyses yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentAnalyses.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.title || a.url}</p>
                        {a.title && a.url && !a.url.startsWith("paste://") && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs truncate underline decoration-dotted underline-offset-2"
                            style={{ color: "var(--accent-blue)" }}
                          >
                            {a.url}
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text3)] whitespace-nowrap flex-shrink-0">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
