import { GoogleGenerativeAI } from "@google/generative-ai";

/** Unversioned 1.5 IDs often 404 on v1beta; use current stable / aliases. */
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
] as const;

function extractResponseText(result: {
  response: {
    text: () => string;
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
}): string {
  try {
    const t = result.response.text();
    if (t?.trim()) return t.trim();
  } catch {
    /* use candidates below */
  }
  const c = result.response.candidates?.[0];
  const parts = c?.content?.parts;
  if (parts?.length) {
    const combined = parts
      .map((p) => (p && typeof p.text === "string" ? p.text : ""))
      .join("");
    if (combined.trim()) return combined.trim();
  }
  const reason = c?.finishReason ?? "unknown";
  throw new Error(
    `Gemini returned no usable text (finishReason: ${reason}). Try another article or check API key / model access.`
  );
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

async function generateWithModel(
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return extractResponseText(result);
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const primary = DEFAULT_GEMINI_MODEL;
  const maxRetries = 3;
  let lastErr: unknown;

  async function attempt(modelName: string): Promise<string> {
    let err: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await generateWithModel(apiKey, modelName, prompt);
      } catch (e) {
        err = e;
        const msg = e instanceof Error ? e.message : String(e);
        const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
        if (is429 && i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 45000 + i * 10000));
          continue;
        }
        throw e;
      }
    }
    throw err;
  }

  try {
    return await attempt(primary);
  } catch (e) {
    lastErr = e;
    const msg = e instanceof Error ? e.message : String(e);
    const tryFallback = /404|not found|not supported|INVALID_ARGUMENT|400|model/i.test(
      msg
    );
    if (tryFallback) {
      for (const name of FALLBACK_MODELS) {
        if (name === primary) continue;
        try {
          return await attempt(name);
        } catch (e2) {
          lastErr = e2;
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}
