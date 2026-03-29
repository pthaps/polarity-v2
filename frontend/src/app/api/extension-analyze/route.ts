import { NextRequest, NextResponse } from "next/server";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** Extension / dashboard: verify route is up and Gemini env is set (no key value exposed). */
export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json(
    {
      ok: true,
      route: "extension-analyze",
      geminiConfigured: hasKey,
      hint: hasKey
        ? "POST JSON { url } to analyze."
        : "Set GEMINI_API_KEY on the server (e.g. Vercel env + redeploy).",
    },
    { headers: corsHeaders }
  );
}

function parseExtensionResponse(text: string): {
  credibility: number;
  horizontal: number;
  confidence: number;
} {
  const credM = text.match(/CREDIBILITY_SCORE:\s*(\d+)/i);
  const horM = text.match(/HORIZONTAL_ESTIMATE:\s*(-?\d+)/i);
  const confM = text.match(/CONFIDENCE:\s*(\d+)/i);
  return {
    credibility: credM
      ? Math.min(100, Math.max(0, parseInt(credM[1], 10)))
      : 50,
    horizontal: horM
      ? Math.min(42, Math.max(-42, parseInt(horM[1], 10)))
      : 0,
    confidence: confM
      ? Math.min(100, Math.max(0, parseInt(confM[1], 10)))
      : 50,
  };
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { \"url\": \"https://...\" }" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy. Local: use frontend/.env.local",
        },
        { status: 500, headers: corsHeaders }
      );
    }

    let article: { url: string; title: string; description: string; body: string };
    try {
      article = await extractArticleFromUrl(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch failed";
      return NextResponse.json(
        { error: `Could not fetch article: ${msg}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const outletRow: AdFontesRow | null = findOutletByUrl(url);
    const excerpt =
      article.body.trim().slice(0, 6000) ||
      "(No article body could be extracted from the page; judge from title, description, and URL only.)";

    const baselineNote = outletRow
      ? `Ad Fontes chart baseline for "${outletRow.newsSource}": vertical (reliability) rank ${outletRow.verticalRank}/64, horizontal (bias) ${outletRow.horizontalRank} (negative = left, positive = right). Blend this prior with the article text.`
      : "No outlet match in Ad Fontes data — estimate from the article text only.";

    const prompt = `You analyze news for political leaning and credibility. ${baselineNote}

[URL] ${article.url}
[Title] ${article.title}
[Description] ${article.description}

[Article excerpt]
${excerpt}

Output EXACTLY in this format (English labels, one value per line):

CREDIBILITY_SCORE: (integer 0-100)
HORIZONTAL_ESTIMATE: (integer -42 to +42; negative = left, positive = right)
CONFIDENCE: (integer 0-100; how confident you are in this assessment)`;

    let raw: string;
    try {
      raw = await generateGeminiText(prompt);
    } catch (geminiErr) {
      const gm =
        geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      return NextResponse.json(
        {
          error: `Gemini API failed: ${gm}`,
          code: "GEMINI_ERROR",
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const parsed = parseExtensionResponse(raw);
    const blended = blendReliabilityAndHorizontal(
      outletRow,
      parsed.credibility,
      parsed.horizontal
    );
    const biasCategory = horizontalToBiasCategory(blended.horizontal);

    return NextResponse.json(
      {
        url: article.url,
        title: article.title,
        reliability: blended.reliability,
        horizontalRank: blended.horizontal,
        biasCategory,
        confidence: parsed.confidence,
        outletBaseline: outletRow
          ? {
              name: outletRow.newsSource,
              verticalRank: outletRow.verticalRank,
              horizontalRank: outletRow.horizontalRank,
            }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: message, code: "INTERNAL" },
      { status: 500, headers: corsHeaders }
    );
  }
}
