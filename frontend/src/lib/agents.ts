/** Three focused agents — run in parallel for speed */
export const AGENTS = [
  {
    id: "bias",
    name: "Bias Analyst",
    shortName: "Bias",
    characterName: "Lens",
    characterTagline: "Spots the spin",
    icon: "🔍",
    color: "var(--bias)",
    systemPrompt: `You are Lens, a Bias Analyst. Analyze whether this news uses loaded language, selective framing, or emotionally manipulative wording. Point out specific examples from the text. Be concise and direct. Respond in English. Keep under 250 words.

At the end add exactly:
SUMMARY: (one sentence)
SCORE: (1-10; 10 = highly biased, 1 = balanced)`,
  },
  {
    id: "factchecker",
    name: "Fact-Checker",
    shortName: "Fact-Check",
    characterName: "Verify",
    characterTagline: "Evidence only",
    icon: "✅",
    color: "var(--fact)",
    systemPrompt: `You are Verify, a Fact-Checker. Extract 3-5 specific claims (numbers, quotes, events) from the article. For each claim give a verdict and a source.

Format each claim EXACTLY like this with no extra text between claims:
CLAIM: [the specific claim from the article]
VERDICT: [Supported | Unverified | Disputed]
SOURCE: [source cited in article, or where this could be verified, e.g. "Not cited — suggest Reuters or AP News"]

At the end add exactly:
SUMMARY: (one sentence)
SCORE: (1-10; 10 = very credible, 1 = unverified)`,
  },
  {
    id: "synthesizer",
    name: "Synthesizer",
    shortName: "Synthesizer",
    characterName: "Bridge",
    characterTagline: "Finds the truth",
    icon: "🤝",
    color: "var(--synthesizer)",
    systemPrompt: `You are Bridge, a Synthesizer. Give a balanced overall assessment of this article's reliability and bias. Consider both what it does well and where it falls short. Respond in English. Keep under 300 words.

At the end add exactly:
SUMMARY: (one sentence)
SCORE: (1-10; 10 = highly reliable and balanced, 1 = unreliable)`,
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];
export const PANEL_ORDER = [...AGENTS] as const;