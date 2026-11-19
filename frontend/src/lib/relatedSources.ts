import "server-only";
import { parseArticleUrl } from "./apiInput";

type SearchResult = { title: string; url: string; content: string };

function sourceField(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max).replace(/[\r\n|]/g, " ").trim() : "";
}

async function searchTavily(query: string): Promise<SearchResult | null> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  const rate = process.env.TAVILY_USD_PER_CREDIT;
  const estimatedUsd = rate?.trim() && Number.isFinite(Number(rate)) && Number(rate) >= 0 ? Number(rate) : null;
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: query.slice(0, 300), max_results: 1, search_depth: "basic" }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    console.info("[provider-usage]", {
      provider: "tavily", status: response.status, credits: response.ok ? 1 : null,
      estimatedUsd: response.ok ? estimatedUsd : null,
    });
    if (!response.ok) return null;
    const result = (await response.json())?.results?.[0];
    const url = parseArticleUrl(result?.url);
    if (!url) return null;
    return {
      url: url.href.replace(/\|/g, "%7C"),
      title: sourceField(result.title, 160) || url.hostname,
      content: sourceField(result.content, 150),
    };
  } catch {
    console.warn("[provider-usage]", { provider: "tavily", outcome: "failed" });
    return null;
  }
}

export function stripModelSources(text: string): string {
  return text.replace(/^\s*(?:SOURCE|SEARCH_RESULT)\s*:.*$/gim, "").trim();
}

export async function addRelatedSearchResults(text: string): Promise<string> {
  const parts = stripModelSources(text).split(/(?=^CLAIM:)/im);
  let remaining = 3;
  return (await Promise.all(parts.map(async (part) => {
    const claim = part.match(/^CLAIM:[ \t]*(.+)$/im)?.[1]?.trim();
    if (!claim || remaining <= 0) return part.trim();
    remaining--;
    const result = await searchTavily(claim);
    if (!result) return part.trim();
    return `${part.trim()}\nSEARCH_RESULT: ${result.title} | ${result.url} | ${result.content}`;
  }))).join("\n\n");
}
