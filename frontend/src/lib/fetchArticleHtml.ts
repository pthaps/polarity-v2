import * as cheerio from "cheerio";

export async function extractArticleFromUrl(url: string): Promise<{
  url: string;
  title: string;
  description: string;
  body: string;
}> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Invalid URL protocol");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    // Fallback: try Tavily extract for paywalled/bot-blocked sites
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && (res.status === 403 || res.status === 401 || res.status === 429)) {
      const tavilyRes = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tavilyKey}` },
        body: JSON.stringify({ urls: [url] }),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);
      if (tavilyRes?.ok) {
        const tavilyData = await tavilyRes.json();
        const extracted = tavilyData.results?.[0];
        if (extracted?.raw_content) {
          return {
            url,
            title: (extracted.title ?? "").trim().slice(0, 500),
            description: "",
            body: extracted.raw_content.trim().slice(0, 50000),
          };
        }
      }
    }
    throw new Error(`Failed to fetch page (${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, iframe, noscript").remove();
  const title =
    $("meta[property='og:title']").attr("content") || $("title").text() || "";
  const description =
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    "";

  const main =
    $("article").first().length > 0
      ? $("article").first()
      : $("main").first().length > 0
        ? $("main").first()
        : $("body");

  const text = main
    .find("p, h1, h2, h3, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n\n");

  const body = text.slice(0, 50000) || $("body").text().slice(0, 50000);

  return {
    url,
    title: title.trim().slice(0, 500),
    description: description.trim().slice(0, 1000),
    body: body.trim().slice(0, 50000),
  };
}
