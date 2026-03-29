import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/readJsonBody";
import { AGENTS } from "@/lib/agents";
import { supabase } from "@/lib/supabase";
import { generateGeminiText } from "@/lib/gemini";
import {
  blendReliabilityAndHorizontal,
  findOutletByUrl,
  horizontalToBiasCategory,
  type AdFontesRow,
} from "@/lib/adFontesCsv";

const MAX_BODY = 3500;

// Stagger requests to avoid hitting rate limits
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchTavily(query: string): Promise<Array<{ title: string; url: string; content: string }>> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ api_key: key, query, max_results: 1, search_depth: "basic" }),
    });
    if (!res.ok) {
      console.error("[Tavily] HTTP error", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    console.log("[Tavily] query:", query, "| results:", data.results?.length ?? 0);
    return data.results ?? [];
  } catch (e) {
    console.error("[Tavily] fetch error", e);
    return [];
  }
}

async function enrichWithTavilySources(text: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return text;
  const parts = text.split(/(?=^CLAIM:)/im);
  const enriched = await Promise.all(
    parts.map(async (part) => {
      if (!/^CLAIM:/im.test(part)) return part;
      const claimMatch = part.match(/^CLAIM:\s*(.+?)(?=\nVERDICT:|$)/im);
      if (!claimMatch) return part;
      const claim = claimMatch[1].trim();

      // Extract source names the AI suggested so we can search "[source] [claim]"
      const sourceNames = [...part.matchAll(/^SOURCE:\s*([^|]+)/gim)].map((m) => m[1].trim()).filter(Boolean);

      // Search once per source name for targeted results, fall back to plain claim search
      const queries = sourceNames.length ? sourceNames.map((s) => `${s} ${claim}`) : [claim];
      const allResults = (await Promise.all(queries.map(searchTavily))).flat();

      // Deduplicate by URL
      const seen = new Set<string>();
      const results = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      }).slice(0, 2);

      if (!results.length) return part;
      const stripped = part.replace(/^SOURCE:.*$/gim, "").replace(/\n{3,}/g, "\n\n").trimEnd();
      const sourceLines = results.map((r) => {
        const snippet = (r.content ?? "").slice(0, 150).replace(/\n/g, " ").trim();
        return `SOURCE: ${r.title} | ${r.url} | ${snippet}`;
      }).join("\n");
      return `${stripped}\n${sourceLines}`;
    })
  );
  return enriched.join("");
}

function buildAgentPrompt(
  agentIndex: number,
  news: { title: string; description: string; body: string }
) {
  const agent = AGENTS[agentIndex];
  return `${agent.systemPrompt}

[Title] ${news.title}
[Description] ${news.description}

[Article]
${news.body.slice(0, MAX_BODY)}`;
}

function parseSummaryAndScore(rawText: string): {
  text: string;
  summary: string;
  score: number | null;
  keywords: string[];
} {
  let text = rawText.trim();
  const summaryMatch = text.match(/\nSUMMARY:\s*(.+?)(?=\n|$)/i);
  const scoreMatch = text.match(/\nSCORE:\s*(\d+(?:\.\d+)?)\s*(?:\/10)?(?=\n|$)/i);
  const keywordsMatch = text.match(/\nKEYWORDS:\s*(.+?)(?=\n|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";
  const score = scoreMatch ? Math.min(10, Math.max(1, parseFloat(scoreMatch[1]))) : null;
  const keywords = keywordsMatch ? keywordsMatch[1].split(",").map((k) => k.trim()).filter(Boolean) : [];
  if (summaryMatch) text = text.replace(/\nSUMMARY:\s*.+?(?=\n|$)/i, "").trim();
  if (scoreMatch) text = text.replace(/\nSCORE:\s*\d+(?:\.\d+)?\s*(?:\/10)?(?=\n|$)/i, "").trim();
  if (keywordsMatch) text = text.replace(/\nKEYWORDS:\s*.+?(?=\n|$)/i, "").trim();
  return { text, summary, score, keywords };
}

function parseHorizontalEstimate(text: string): number | null {
  const m = text.match(/HORIZONTAL_ESTIMATE:\s*(-?\d+)/i);
  if (!m) return null;
  return Math.min(42, Math.max(-42, parseInt(m[1], 10)));
}

async function runAgentWithRetry(index: number, news: { title: string; description: string; body: string }) {
  const agent = AGENTS[index];
  const prompt = buildAgentPrompt(index, news);

  let raw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = await generateGeminiText(prompt);
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
      if (is429 && attempt < 2) {
        await sleep(3000 * (attempt + 1)); // 3s, then 6s
        continue;
      }
      raw = `Analysis temporarily unavailable — please try again.`;
      break;
    }
  }

  const { text, summary, score, keywords } = parseSummaryAndScore(raw);
  return {
    agentId: agent.id,
    name: agent.name,
    shortName: agent.shortName,
    color: agent.color,
    text,
    summary: summary || text.slice(0, 200),
    score,
    keywords,
  };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody<{
      url: string;
      title: string;
      description: string;
      body: string;
    }>(request);
    if (!parsed.ok) return parsed.response;
    const { url, title, description, body: newsBody } = parsed.data;

    if (!newsBody?.trim()) {
      return NextResponse.json({ error: "Article body is required" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const articleUrl = (url && url.trim()) || "paste://article";
    const outletRow: AdFontesRow | null = findOutletByUrl(articleUrl);
    const news = { url: articleUrl, title: title || "", description: description || "", body: newsBody };

    // Run all agents in parallel (no stagger)
    const agentResults = await Promise.all(
      AGENTS.map((_, i) => runAgentWithRetry(i, news))
    );

    // Build final synthesis prompt (uses only summaries/scores — not SOURCE lines)
    const baselineNote = outletRow
      ? `Ad Fontes baseline: "${outletRow.newsSource}" — reliability ${outletRow.verticalRank}/64, bias ${outletRow.horizontalRank} (negative=left, positive=right).`
      : "No outlet baseline — infer from article only.";

    const finalPrompt = `You are a news credibility summarizer.

${baselineNote}

Three analyst findings:
${agentResults.map((r) => `- ${r.name}: ${r.summary} | Score: ${r.score ?? "—"}/10`).join("\n")}

Output EXACTLY (no extra text):
CREDIBILITY_SCORE: (0-100)
HORIZONTAL_ESTIMATE: (-42 to +42)
BIAS_CONFIDENCE: (0-100)
POLITICAL_NEUTRALITY: (0-100; score how free from partisan framing this article is — 100=perfectly centered, low=strong political lean)
LANGUAGE_NEUTRALITY: (0-100; score how neutral the actual word choices are — 100=clinical/neutral language, low=loaded/emotional/manipulative wording detected)
COVERAGE_BALANCE: (0-100; score whether multiple perspectives are represented fairly — 100=balanced coverage of all sides, low=one-sided or missing key viewpoints)
FINAL_SUMMARY: (2-3 sentences)`;

    // Run Tavily enrichment and final synthesis in parallel
    const fcIndex = agentResults.findIndex((r) => r.agentId === "factchecker");
    const [finalText] = await Promise.all([
      generateGeminiText(finalPrompt).catch(() => ""),
      fcIndex !== -1
        ? enrichWithTavilySources(agentResults[fcIndex].text).then((t) => { agentResults[fcIndex].text = t; })
        : Promise.resolve(),
    ]);

    let finalSummary = "";
    let aiCredibility: number | null = null;
    let aiHorizontal: number | null = null;
    let biasConfidence: number | null = null;
    let politicalNeutrality: number | null = null;
    let languageNeutrality: number | null = null;
    let coverageBalance: number | null = null;

    try {
      const credMatch = finalText.match(/CREDIBILITY_SCORE:\s*(\d+)/i);
      const confMatch = finalText.match(/BIAS_CONFIDENCE:\s*(\d+)/i);
      const polMatch = finalText.match(/POLITICAL_NEUTRALITY:\s*(\d+)/i);
      const langMatch = finalText.match(/LANGUAGE_NEUTRALITY:\s*(\d+)/i);
      const covMatch = finalText.match(/COVERAGE_BALANCE:\s*(\d+)/i);
      const summaryMatch = finalText.match(/FINAL_SUMMARY:\s*([\s\S]+?)(?=\n\n|$)/i);
      if (credMatch) aiCredibility = Math.min(100, Math.max(0, parseInt(credMatch[1], 10)));
      const hEst = parseHorizontalEstimate(finalText);
      if (hEst !== null) aiHorizontal = hEst;
      if (confMatch) biasConfidence = Math.min(100, Math.max(0, parseInt(confMatch[1], 10)));
      if (polMatch) politicalNeutrality = Math.min(100, Math.max(0, parseInt(polMatch[1], 10)));
      if (langMatch) languageNeutrality = Math.min(100, Math.max(0, parseInt(langMatch[1], 10)));
      if (covMatch) coverageBalance = Math.min(100, Math.max(0, parseInt(covMatch[1], 10)));
      finalSummary = summaryMatch ? summaryMatch[1].trim() : finalText.slice(0, 600);
    } catch {
      finalSummary = agentResults.map((r) => `${r.name}: ${r.summary}`).join(". ");
    }

    const blended = blendReliabilityAndHorizontal(outletRow, aiCredibility ?? 50, aiHorizontal ?? 0);
    const biasCategory = horizontalToBiasCategory(blended.horizontal);

    if (supabase) {
      void supabase.from("analyses").insert({ url: news.url, title: news.title, replies: agentResults });
    }

    return NextResponse.json({
      url: news.url,
      title: news.title,
      replies: agentResults,
      finalSummary,
      credibilityScore: blended.reliability,
      horizontalRank: blended.horizontal,
      biasCategory,
      biasPosition: biasCategory,
      biasConfidence: biasConfidence ?? 50,
      politicalNeutrality: politicalNeutrality ?? null,
      languageNeutrality: languageNeutrality ?? null,
      coverageBalance: coverageBalance ?? null,
      outletBaseline: outletRow
        ? { name: outletRow.newsSource, verticalRank: outletRow.verticalRank, horizontalRank: outletRow.horizontalRank }
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("analyze error", e);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}