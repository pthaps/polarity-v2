import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";
import { supabase } from "@/lib/supabase";
import { generateGeminiText } from "@/lib/gemini";
import {
  blendReliabilityAndHorizontal,
  findOutletByUrl,
  horizontalToBiasCategory,
  type AdFontesRow,
} from "@/lib/adFontesCsv";

const MAX_BODY = 8000;

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
} {
  let text = rawText.trim();
  const summaryMatch = text.match(/\nSUMMARY:\s*(.+?)(?=\n|$)/i);
  const scoreMatch = text.match(/\nSCORE:\s*(\d+(?:\.\d+)?)\s*(?:\/10)?(?=\n|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";
  const score = scoreMatch ? Math.min(10, Math.max(1, parseFloat(scoreMatch[1]))) : null;
  if (summaryMatch) text = text.replace(/\nSUMMARY:\s*.+?(?=\n|$)/i, "").trim();
  if (scoreMatch) text = text.replace(/\nSCORE:\s*\d+(?:\.\d+)?\s*(?:\/10)?(?=\n|$)/i, "").trim();
  return { text, summary, score };
}

function parseHorizontalEstimate(text: string): number | null {
  const m = text.match(/HORIZONTAL_ESTIMATE:\s*(-?\d+)/i);
  if (!m) return null;
  return Math.min(42, Math.max(-42, parseInt(m[1], 10)));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      url: string;
      title: string;
      description: string;
      body: string;
    };
    const { url, title, description, body: newsBody } = body;

    if (!newsBody?.trim()) {
      return NextResponse.json({ error: "Article body is required" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const articleUrl = (url && url.trim()) || "paste://article";
    const outletRow: AdFontesRow | null = findOutletByUrl(articleUrl);
    const news = { url: articleUrl, title: title || "", description: description || "", body: newsBody };

    // ── All 3 agents run in PARALLEL ──────────────────────────────────────
    const agentResults = await Promise.all(
      AGENTS.map(async (agent, i) => {
        let raw = "";
        try {
          raw = await generateGeminiText(buildAgentPrompt(i, news));
        } catch (e) {
          raw = e instanceof Error ? `(Error: ${e.message})` : "(Failed.)";
        }
        const { text, summary, score } = parseSummaryAndScore(raw);
        return {
          agentId: agent.id,
          name: agent.name,
          shortName: agent.shortName,
          color: agent.color,
          text,
          summary: summary || text.slice(0, 200),
          score,
        };
      })
    );

    // ── Final synthesis — short prompt, fast ──────────────────────────────
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
FINAL_SUMMARY: (2-3 sentences)`;

    let finalSummary = "";
    let aiCredibility: number | null = null;
    let aiHorizontal: number | null = null;
    let biasConfidence: number | null = null;

    try {
      const finalText = await generateGeminiText(finalPrompt);
      const credMatch = finalText.match(/CREDIBILITY_SCORE:\s*(\d+)/i);
      const confMatch = finalText.match(/BIAS_CONFIDENCE:\s*(\d+)/i);
      const summaryMatch = finalText.match(/FINAL_SUMMARY:\s*([\s\S]+?)(?=\n\n|$)/i);
      if (credMatch) aiCredibility = Math.min(100, Math.max(0, parseInt(credMatch[1], 10)));
      const hEst = parseHorizontalEstimate(finalText);
      if (hEst !== null) aiHorizontal = hEst;
      if (confMatch) biasConfidence = Math.min(100, Math.max(0, parseInt(confMatch[1], 10)));
      finalSummary = summaryMatch ? summaryMatch[1].trim() : finalText.slice(0, 600);
    } catch {
      finalSummary = agentResults.map((r) => `${r.name}: ${r.summary}`).join(". ");
    }

    const blended = blendReliabilityAndHorizontal(outletRow, aiCredibility ?? 50, aiHorizontal ?? 0);
    const biasCategory = horizontalToBiasCategory(blended.horizontal);

    // Fire-and-forget save — never block the response
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