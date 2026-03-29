import fs from "fs";
import path from "path";

export type { BiasCategory5 } from "./biasMath";
export { horizontalToBiasCategory, horizontalToSliderPercent, biasCategoryIndex } from "./biasMath";

export type AdFontesRow = {
  newsSource: string;
  verticalRank: number;
  horizontalRank: number;
};

let cachedRows: AdFontesRow[] | null = null;

function resolveCsvPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "src", "data", "ad-fontes-media.csv"),
    path.join(process.cwd(), ".next", "standalone", "src", "data", "ad-fontes-media.csv"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function loadAdFontesRows(): AdFontesRow[] {
  if (cachedRows) return cachedRows;
  const csvPath = resolveCsvPath();
  if (!csvPath) {
    console.warn(
      "[adFontesCsv] ad-fontes-media.csv not found; outlet baseline matching disabled."
    );
    cachedRows = [];
    return cachedRows;
  }
  let raw: string;
  try {
    raw = fs.readFileSync(csvPath, "utf-8");
  } catch (e) {
    console.warn("[adFontesCsv] failed to read CSV:", e);
    cachedRows = [];
    return cachedRows;
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: AdFontesRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^"([^"]*)","(-?\d+)","(-?\d+)"$/);
    if (!m) continue;
    rows.push({
      newsSource: m[1],
      verticalRank: parseInt(m[2], 10),
      horizontalRank: parseInt(m[3], 10),
    });
  }
  cachedRows = rows;
  return rows;
}

/** Ad Fontes vertical (reliability) 0–64 → 0–100 */
export function verticalToReliability100(vertical: number): number {
  const v = Math.min(64, Math.max(0, vertical));
  return Math.round((v / 64) * 100);
}

/**
 * Known hostname → exact "News Source" string in CSV (subset; extend as needed).
 */
const DOMAIN_TO_SOURCE: Record<string, string> = {
  "cnn.com": "CNN",
  "edition.cnn.com": "CNN",
  "foxnews.com": "Fox",
  "msnbc.com": "MSNBC",
  "nbcnews.com": "NBC",
  "cbsnews.com": "CBS",
  "abcnews.go.com": "ABC",
  "abc.net.au": "ABC",
  "nytimes.com": "New York Times",
  "washingtonpost.com": "Washington Post",
  "wsj.com": "Wall Street Journal",
  "reuters.com": "Reuters",
  "apnews.com": "AP",
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "theguardian.com": "The Guardian",
  "politico.com": "Politico",
  "axios.com": "Axios",
  "bloomberg.com": "Bloomberg",
  "npr.org": "NPR",
  "pbs.org": "PBS",
  "breitbart.com": "Breitbart",
  "dailycaller.com": "Daily Caller",
  "nationalreview.com": "National Review",
  "theatlantic.com": "The Atlantic",
  "economist.com": "The Economist",
  "time.com": "Time",
  "usatoday.com": "USA Today",
  "latimes.com": "LA Times",
  "huffpost.com": "Huffington Post",
  "huffingtonpost.com": "Huffington Post",
  "vox.com": "Vox",
  "slate.com": "Slate",
  "motherjones.com": "Mother Jones",
  "thehill.com": "The Hill",
  "newsmax.com": "NewsMax",
  "oann.com": "OAN",
  "theblaze.com": "The Blaze",
  "dailywire.com": "Daily Wire",
  "forbes.com": "Forbes",
  "businessinsider.com": "Business Insider",
  "marketwatch.com": "Marketwatch",
  "ft.com": "Financial Times",
  "reason.com": "Reason",
  "propublica.org": "ProPublica",
  "newyorker.com": "The New Yorker",
  "vanityfair.com": "Vanity Fair",
  "vice.com": "Vice",
  "quartz.com": "Quartz",
  "fivethirtyeight.com": "FiveThirtyEight",
};

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Best-effort match: domain map, then substring match on source name vs hostname. */
export function findOutletByUrl(articleUrl: string): AdFontesRow | null {
  if (/^paste:\/\//i.test(articleUrl.trim())) return null;
  let hostname = "";
  try {
    hostname = normalizeHost(new URL(articleUrl).hostname);
  } catch {
    return null;
  }
  const rows = loadAdFontesRows();
  const byDomain = DOMAIN_TO_SOURCE[hostname];
  if (byDomain) {
    const exact = rows.find((r) => r.newsSource === byDomain);
    if (exact) return exact;
  }
  for (const row of rows) {
    const name = row.newsSource.toLowerCase();
    const alpha = name.replace(/[^a-z0-9]+/g, "");
    if (alpha.length >= 3 && hostname.replace(/[^a-z0-9]/g, "").includes(alpha)) {
      return row;
    }
  }
  const bare = hostname.split(".")[0] ?? "";
  for (const row of rows) {
    const slug = row.newsSource.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (slug.length >= 3 && bare.includes(slug.slice(0, Math.min(6, slug.length)))) {
      return row;
    }
  }
  return null;
}

export function blendReliabilityAndHorizontal(
  csv: AdFontesRow | null,
  aiReliability: number,
  aiHorizontal: number
): { reliability: number; horizontal: number } {
  const aiR = Math.min(100, Math.max(0, aiReliability));
  const aiH = Math.min(42, Math.max(-42, aiHorizontal));
  if (!csv) {
    return { reliability: aiR, horizontal: aiH };
  }
  const csvRel = verticalToReliability100(csv.verticalRank);
  const csvH = csv.horizontalRank;
  return {
    reliability: Math.round(0.45 * csvRel + 0.55 * aiR),
    horizontal: Math.round(0.45 * csvH + 0.55 * aiH),
  };
}
