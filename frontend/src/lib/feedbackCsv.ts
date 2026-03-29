import { access, appendFile, constants, mkdir } from "fs/promises";
import path from "path";

const CSV_NAME = "feedback-log.csv";

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Appends one feedback row next to this module as `feedback-log.csv`.
 * Columns: timestamp_iso, url, title, rating, comment
 */
export async function appendFeedbackCsv(row: {
  url: string;
  title: string;
  rating: string;
  comment: string | null;
}): Promise<void> {
  const dir = path.join(process.cwd(), "src", "lib");
  const filePath = path.join(dir, CSV_NAME);
  await mkdir(dir, { recursive: true });

  try {
    await access(filePath, constants.F_OK);
  } catch {
    await appendFile(
      filePath,
      "timestamp_iso,url,title,rating,comment\n",
      "utf8"
    );
  }

  const ts = new Date().toISOString();
  const line = [
    ts,
    csvField(row.url),
    csvField(row.title),
    csvField(row.rating),
    row.comment ? csvField(row.comment) : "",
  ].join(",") + "\n";

  await appendFile(filePath, line, "utf8");
}
