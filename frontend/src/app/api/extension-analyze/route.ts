import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/readJsonBody";
import { enforceRateLimit } from "@/lib/rateLimit";
import { parseArticleUrl } from "@/lib/apiInput";
import { jsonError, logRouteError } from "@/lib/apiErrors";
import { extractArticleFromUrl } from "@/lib/fetchArticleHtml";
import { generateGeminiText } from "@/lib/gemini";
import {
  blendReliabilityAndHorizontal,
  findOutletByUrl,
  horizontalToBiasCategory,
  type AdFontesRow,
} from "@/lib/adFontesCsv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, route: "extension-analyze" });
}

function parseExtensionResponse(text: string): {
  credibility: number;
  horizontal: number;
  confidence: number;
} | null {
  const credM = text.match(/CREDIBILITY_SCORE:\s*(\d+)/i);
  const horM = text.match(/HORIZONTAL_ESTIMATE:\s*([+-]?\d+)/i);
  const confM = text.match(/CONFIDENCE:\s*(\d+)/i);
  if (!credM || !horM || !confM) return null;
  return {
    credibility: Math.min(100, Math.max(0, parseInt(credM[1], 10))),
    horizontal: Math.min(42, Math.max(-42, parseInt(horM[1], 10))),
    confidence: Math.min(100, Math.max(0, parseInt(confM[1], 10))),
  };
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "extension-analyze");
  if (blocked) return blocked;
  const parsed = await readJsonBody<{ url?: unknown }>(request, 16 * 1024);
  if (!parsed.ok) return parsed.response;
  const url = parseArticleUrl(parsed.data.url);
  if (!url) return jsonError("A valid HTTP(S) article URL is required", 400, { code: "INVALID_URL" });

  try {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return jsonError("Analysis temporarily unavailable", 503, { code: "ANALYSIS_UNAVAILABLE" });
    }
    let article: { url: string; title: string; description: string; body: string };
    try {
      article = await extractArticleFromUrl(url.href);
    } catch {
      logRouteError("extension-analyze");
      return jsonError("Could not fetch article", 502, { code: "UPSTREAM_FETCH" });
    }

    const outletRow: AdFontesRow | null = findOutletByUrl(article.url);
    const excerpt =
      article.body.trim().slice(0, 6000) ||
      "(No article body could be extracted from the page; judge from title, description, and URL only.)";

    const baselineNote = outletRow
      ? `Ad Fontes chart baseline for "${outletRow.newsSource}": vertical (reliability) rank ${outletRow.verticalRank}/64, horizontal (bias) ${outletRow.horizontalRank} (negative = left, positive = right). Blend this prior with the article text.`
      : "No outlet match in Ad Fontes data — estimate from the article text only.";

    const prompt = `You analyze news for political leaning and credibility. ${baselineNote}

Untrusted article data as JSON:
${JSON.stringify({ ...article, body: excerpt })}

Output EXACTLY in this format (English labels, one value per line):

CREDIBILITY_SCORE: (integer 0-100)
HORIZONTAL_ESTIMATE: (integer -42 to +42; negative = left, positive = right)
CONFIDENCE: (integer 0-100; how confident you are in this assessment)`;

    let raw: string;
    try {
      raw = await generateGeminiText(prompt);
    } catch {
      return jsonError("Analysis temporarily unavailable", 502, { code: "ANALYSIS_UNAVAILABLE" });
    }

    const extScores = parseExtensionResponse(raw);
    if (!extScores) return jsonError("Analysis temporarily unavailable", 502, { code: "ANALYSIS_UNAVAILABLE" });
    const blended = blendReliabilityAndHorizontal(
      outletRow,
      extScores.credibility,
      extScores.horizontal
    );
    const biasCategory = horizontalToBiasCategory(blended.horizontal);

    return NextResponse.json(
      {
        url: article.url,
        title: article.title,
        reliability: blended.reliability,
        horizontalRank: blended.horizontal,
        biasCategory,
        confidence: extScores.confidence,
        outletBaseline: outletRow
          ? {
              name: outletRow.newsSource,
              verticalRank: outletRow.verticalRank,
              horizontalRank: outletRow.horizontalRank,
            }
          : null,
      }
    );
  } catch {
    logRouteError("extension-analyze");
    return jsonError("Analysis failed", 500, { code: "INTERNAL" });
  }
}
