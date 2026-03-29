"use client";

import { useEffect, useState } from "react";

/** Accent colors (unchanged in dark mode). Semantic UI uses CSS vars so Navbar theme toggle applies. */
const C = {
  crimson: "#a31621",
  navy: "#1a3a8f",
  slate: "#4a72c4",
  gray: "#7a7a7a",
  orange: "#c4503a",
};

const SEM = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  border: "var(--border)",
  text: "var(--text)",
  text2: "var(--text2)",
  text3: "var(--text3)",
  track: "var(--traction-track)",
} as const;

const PLAYFAIR = "'Playfair Display', Georgia, serif";
const MONO = "'DM Mono', monospace";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: SEM.text3, whiteSpace: "nowrap" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: SEM.border }} />
    </div>
  );
}

function KpiCard({ color, badge, badgeBg, badgeColor, number, numberColor, label, sub }: {
  color: string; badge: string; badgeBg: string; badgeColor: string;
  number: string; numberColor: string; label: string; sub: string;
}) {
  return (
    <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "inline-block", fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, marginBottom: 10, background: badgeBg, color: badgeColor }}>
          {badge}
        </div>
        <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 36, lineHeight: 1, color: numberColor, marginBottom: 6 }}>{number}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: SEM.text2, marginBottom: 4, fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3 }}>{sub}</div>
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: SEM.text2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: SEM.track, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function BarItem({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: SEM.text2 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: SEM.text3 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: SEM.track, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: SEM.text3, marginBottom: 20 }}>{children}</div>;
}

function Infobox({ label, labelColor, text, textColor, bg, borderColor }: {
  label?: string; labelColor?: string; text: string; textColor: string; bg: string; borderColor: string;
}) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${borderColor}`, borderRadius: 8, padding: "12px 14px", marginTop: 14 }}>
      {label && <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: labelColor, marginBottom: 4 }}>{label}</div>}
      <div style={{ fontSize: 12, color: textColor, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

const SPECTRUM_DOTS = [C.navy, C.slate, C.gray, C.orange, C.crimson];

export default function TractionAnalyticsPage() {
  const [appData, setAppData] = useState<{ totalAnalyses: number; totalFeedback: number; positiveRate: number | null } | null>(null);

  useEffect(() => {
    fetch("/api/traction")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setAppData(d); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: SEM.bg, minHeight: "100vh", color: SEM.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 60px" }}>

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: PLAYFAIR, fontStyle: "italic", fontWeight: 700, fontSize: 32, color: C.crimson, marginBottom: 4 }}>Traction</h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: SEM.text3, letterSpacing: "0.05em" }}>Launch Weekend · March 2026 · All organic · Updated manually</p>
          {/* Spectrum strip */}
          <div style={{ display: "flex", height: 3, marginTop: 16, borderRadius: 2, overflow: "hidden" }}>
            {SPECTRUM_DOTS.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
          </div>
        </div>

        {/* HERO KPI STRIP */}
        <SectionLabel>Key Metrics</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 36 }}>
          <KpiCard color={C.crimson} badge="↑ Day 1" badgeBg="var(--traction-soft-red)" badgeColor={C.crimson} number="69" numberColor={C.crimson} label="Followers" sub="+18.9% since launch" />
          <KpiCard color={C.navy} badge="Social" badgeBg="var(--traction-soft-blue)" badgeColor={C.navy} number="5.2k" numberColor={C.navy} label="Impressions" sub="Total impressions to date" />
          <KpiCard color={C.slate} badge="Organic" badgeBg="var(--traction-soft-slate)" badgeColor={C.slate} number="500+" numberColor={C.slate} label="Accounts Reached" sub="Zero paid promotion" />
          <KpiCard color={C.orange} badge="Early Users" badgeBg="var(--traction-soft-orange)" badgeColor={C.orange} number="26" numberColor={C.orange} label="Survey Responses" sub="In first 12 hours" />
          <KpiCard color={C.gray} badge="Salve Regina" badgeBg="var(--traction-soft-gray)" badgeColor={C.gray} number="50+" numberColor={C.gray} label="Educators Invited" sub="Live demo, unsolicited" />
        </div>

        {/* TIMELINE + QUOTES */}
        <SectionLabel>Launch Story</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 36 }}>

          {/* Timeline */}
          <Card>
            <CardTitle>Launch Timeline</CardTitle>
            {[
              { marker: "Hour 0", stat: "—", statColor: SEM.text3, statMono: true, desc: <>Launch — Zero followers. Zero reach. <strong style={{ color: SEM.text }}>Product goes live.</strong></> },
              { marker: "Hour 8", stat: "58", statColor: C.crimson, desc: <><strong style={{ color: SEM.text }}>Followers</strong> · All organic, zero paid</> },
              { marker: "Hour 12", stat: "26", statColor: C.navy, desc: <><strong style={{ color: SEM.text }}>Survey responses</strong> from real users in the first half-day</> },
              { marker: "Weekend", stat: "5.2k", statColor: C.slate, desc: <><strong style={{ color: SEM.text }}>Impressions</strong> · 500+ accounts reached organically</> },
              { marker: "Current", stat: "69", statColor: C.crimson, desc: <><strong style={{ color: SEM.text }}>Followers</strong> · +18.9% growth since launch</> },
              { marker: "Inbound", stat: "CTL", statColor: C.navy, statMono: true, desc: <><strong style={{ color: SEM.text }}>Salve Regina</strong> Center for Teaching &amp; Learning invited Polarity to present to 50+ educators — without being pitched.</> },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < arr.length - 1 ? `1px solid ${SEM.border}` : "none", alignItems: "flex-start" }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3, whiteSpace: "nowrap", minWidth: 64, paddingTop: 2 }}>{row.marker}</div>
                <div style={{ fontFamily: row.statMono ? MONO : PLAYFAIR, fontWeight: 700, fontSize: row.statMono ? 13 : 20, color: row.statColor, minWidth: 52, lineHeight: 1, paddingTop: row.statMono ? 3 : 1 }}>{row.stat}</div>
                <div style={{ fontSize: 13, color: SEM.text2, lineHeight: 1.5 }}>{row.desc}</div>
              </div>
            ))}
          </Card>

          {/* Quotes */}
          <Card>
            <CardTitle>Product-Market Fit · User Voices</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { border: C.crimson, text: "\"I've wanted something like this for years. I teach media literacy and there's nothing that actually shows students the debate behind a score.\"", attr: "Educator · Survey Respondent" },
                { border: C.navy, text: "\"The bias scores were different even though the outlets are similar — that's exactly what I expected.\"", attr: "Early User · Feedback Form" },
                { border: C.slate, text: "\"The Chrome extension is what gets me. I can check any article I'm already reading — I don't have to change my workflow at all.\"", attr: "Survey Respondent" },
              ].map((q, i) => (
                <div key={i} style={{ border: `1.5px solid ${SEM.border}`, borderLeft: `4px solid ${q.border}`, borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, color: SEM.text2, lineHeight: 1.65, marginBottom: 8, fontStyle: "italic" }}>{q.text}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3, letterSpacing: "0.05em" }}>{q.attr}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SURVEY BREAKDOWN */}
        <SectionLabel>Survey Insights · 26 Responses</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 36 }}>

          {/* Would use app */}
          <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: SEM.text3, marginBottom: 14 }}>Would Use App?</div>
            <div style={{ textAlign: "center", padding: "10px 0 14px" }}>
              <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 48, color: C.crimson, lineHeight: 1 }}>81%</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3, marginTop: 4 }}>Said Yes · 21 of 26</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <BarItem label="Yes" pct={81} color={C.crimson} />
              <BarItem label="No" pct={19} color={C.gray} />
            </div>
          </div>

          {/* Trust */}
          <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: SEM.text3, marginBottom: 14 }}>Trust in Online News</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <BarItem label="Somewhat" pct={58} color={C.navy} />
              <BarItem label="Not Much" pct={38} color={C.orange} />
              <BarItem label="A Lot" pct={4} color={C.gray} />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: SEM.text3, lineHeight: 1.5 }}>96% have low-to-moderate trust — clear demand for a verification tool.</div>
          </div>

          {/* Verify */}
          <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: SEM.text3, marginBottom: 14 }}>Verify Before Sharing</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <BarItem label="Sometimes" pct={50} color={C.slate} />
              <BarItem label="Always" pct={42} color={C.navy} />
              <BarItem label="Rarely" pct={4} color={C.gray} />
              <BarItem label="Never" pct={0} color={C.gray} />
            </div>
          </div>

          {/* Age */}
          <div style={{ background: SEM.surface, border: `1.5px solid ${SEM.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: SEM.text3, marginBottom: 14 }}>Age Distribution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <BarItem label="25–34" pct={42} color={C.crimson} />
              <BarItem label="18–24" pct={23} color={C.navy} />
              <BarItem label="35–44" pct={23} color={C.slate} />
              <BarItem label="55+" pct={8} color={C.gray} />
              <BarItem label="Under 18" pct={4} color={C.orange} />
            </div>
          </div>
        </div>

        {/* GROWTH & RETENTION */}
        <SectionLabel>Growth &amp; Retention</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 36 }}>

          {/* Acquisition */}
          <Card>
            <CardTitle>Acquisition Channel</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
              <ProgressBar label="Organic Social" pct={100} color={C.crimson} />
              <ProgressBar label="Paid Ads" pct={0} color={C.gray} />
              <ProgressBar label="Institutional Inbound" pct={55} color={C.navy} />
            </div>
            <Infobox label="Zero CAC" labelColor={C.crimson} text="Every follower, impression, and institutional contact earned without paid promotion." textColor={SEM.text2} bg="var(--traction-soft-red)" borderColor="var(--traction-soft-red-border)" />
          </Card>

          {/* Audience */}
          <Card>
            <CardTitle>Audience Segments</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
              <ProgressBar label="Educators & Researchers" pct={75} color={C.navy} />
              <ProgressBar label="General Readers" pct={50} color={C.slate} />
              <ProgressBar label="Newsrooms / B2B API" pct={25} color={C.orange} />
            </div>
            <Infobox text="Multiple analyses per session · Zero churn · Unsolicited institutional outreach" textColor={SEM.text3} bg={SEM.bg} borderColor={SEM.border} />
          </Card>

          {/* Churn */}
          <Card>
            <CardTitle>Churn &amp; Retention</CardTitle>
            <div style={{ background: "color-mix(in srgb, #a31621 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, #a31621 25%, var(--border))", borderRadius: 10, padding: 24, textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.crimson, marginBottom: 8 }}>Reported Churn</div>
              <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 56, color: C.crimson, lineHeight: 1 }}>0%</div>
            </div>
            <Infobox text="Multiple analyses per session observed across early user cohort." textColor={SEM.text3} bg={SEM.bg} borderColor={SEM.border} />
            <Infobox label="PMF Signal" labelColor={C.navy} text="Institutional partner came inbound — without a pitch." textColor={SEM.text2} bg="var(--traction-soft-blue)" borderColor="var(--traction-soft-blue-border)" />
          </Card>
        </div>

        {/* APP USAGE (live from Supabase) */}
        {appData && (
          <>
            <SectionLabel>Live App Usage</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <KpiCard color={C.navy} badge="All time" badgeBg="var(--traction-soft-blue)" badgeColor={C.navy} number={appData.totalAnalyses.toLocaleString()} numberColor={C.navy} label="Analyses Run" sub="Articles analyzed via Polarity" />
              <KpiCard color={C.slate} badge="Feedback" badgeBg="var(--traction-soft-slate)" badgeColor={C.slate} number={appData.totalFeedback.toLocaleString()} numberColor={C.slate} label="User Ratings" sub="In-app feedback submissions" />
              <KpiCard color={C.crimson} badge="Accuracy" badgeBg="var(--traction-soft-red)" badgeColor={C.crimson} number={appData.positiveRate !== null ? `${appData.positiveRate}%` : "—"} numberColor={C.crimson} label="Positive Rating" sub="Users who found it accurate" />
            </div>
          </>
        )}

      </main>

      <footer style={{ borderTop: `1.5px solid ${SEM.border}`, background: SEM.surface, padding: "20px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {SPECTRUM_DOTS.map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
            </div>
            <span style={{ fontFamily: PLAYFAIR, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: C.crimson }}>Polarity</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3, marginLeft: 10 }}>
              polarityapp.com · arXiv:2509.17395 · Ad Fontes Media
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: SEM.text3, textAlign: "right" }}>
            Data from launch weekend<br />Last updated manually
          </div>
        </div>
      </footer>
    </div>
  );
}
