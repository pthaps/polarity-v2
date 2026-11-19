import * as cheerio from "cheerio";
import { fetchPublicHtml } from "./publicHtml";

export async function extractArticleFromUrl(url: string): Promise<{
  url: string;
  title: string;
  description: string;
  body: string;
}> {
  const { html, url: finalUrl } = await fetchPublicHtml(url);
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
    url: finalUrl,
    title: title.trim().slice(0, 500),
    description: description.trim().slice(0, 1000),
    body: body.trim().slice(0, 50000),
  };
}
