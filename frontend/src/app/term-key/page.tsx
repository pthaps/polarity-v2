export default function TermKeyPage() {
  const terms = [
    {
      term: "Credibility Score",
      definition: "A 0–100 score reflecting how reliable and accurate the article is, based on sourcing, factual accuracy, and reporting quality. Scores above 70 indicate higher reliability.",
    },
    {
      term: "Bias Placement",
      definition: "Where the article falls on the political spectrum — Far Left, Lean Left, Center, Lean Right, or Far Right — based on framing, word choice, and perspective.",
    },
    {
      term: "Neutrality Index",
      definition: "An average of Political Neutrality, Language Neutrality, and Coverage Balance. Higher scores indicate more balanced, impartial reporting.",
    },
    {
      term: "Political Neutrality",
      definition: "How free the article is from partisan framing. 100 = perfectly centered with no political lean. Low scores indicate strong ideological positioning.",
    },
    {
      term: "Language Neutrality",
      definition: "How neutral the actual word choices are. 100 = clinical, objective language. Low scores indicate loaded, emotional, or manipulative wording.",
    },
    {
      term: "Coverage Balance",
      definition: "Whether multiple perspectives are represented fairly. 100 = all sides of the issue are included. Low scores indicate one-sided or incomplete coverage.",
    },
    {
      term: "Factual Expression",
      definition: "A spectrum from Reporting (factual, sourced) to Opinion (interpretive, editorial). Intermediate labels: Mostly Reporting, Mixed, Mostly Opinion.",
    },
    {
      term: "Supported",
      definition: "A fact-checked claim that is backed by credible, verifiable sources.",
    },
    {
      term: "Unverified",
      definition: "A claim that could not be confirmed or denied with available sources — not necessarily false, but lacking evidence.",
    },
    {
      term: "Disputed",
      definition: "A claim that contradicts credible sources or is actively contested by evidence.",
    },
    {
      term: "Horizontal Rank",
      definition: "A numerical value from -42 (Far Left) to +42 (Far Right) representing political position. Derived from AI analysis and Ad Fontes Media baseline data.",
    },
    {
      term: "Ad Fontes Factors",
      definition: "A set of scoring dimensions inspired by Ad Fontes Media's methodology, measuring expression style, veracity, headline accuracy, and neutrality.",
    },
    {
      term: "Bias Analyst (Lens)",
      definition: "The AI agent that scans the article for loaded language, selective framing, and emotionally manipulative wording — flagging specific examples.",
    },
    {
      term: "Fact-Checker (Verify)",
      definition: "The AI agent that extracts 3–5 specific claims from the article and assesses whether each is supported, unverified, or disputed, with linked sources.",
    },
    {
      term: "Synthesizer (Bridge)",
      definition: "The AI agent that weighs all findings for a balanced final verdict — what the article does well, where it falls short, and an overall reliability score.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Term Key</h1>
          <p className="text-[var(--text2)] text-sm">Definitions for every metric and label used in Polarity's analysis.</p>
        </div>
        <div className="space-y-3">
          {terms.map((t) => (
            <div key={t.term} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <h2
                className="text-sm font-semibold mb-1"
                style={{
                  background: "linear-gradient(90deg, #2563EB, #B91C1C)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t.term}
              </h2>
              <p className="text-sm text-[var(--text2)] leading-relaxed">{t.definition}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="mt-12 border-t border-[var(--border)] py-6 text-center text-sm text-[var(--text3)]">
        <p>Polarity — Multi-perspective news analysis</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Polarity. All rights reserved.</p>
      </footer>
    </div>
  );
}
