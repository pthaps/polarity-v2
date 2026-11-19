import { jsonError } from "./apiErrors";

export async function readJsonBody<T>(request: Request, maxBytes = 4096): Promise<
  { ok: true; data: T } | { ok: false; response: Response }
> {
  const invalid = () => ({ ok: false as const, response: jsonError("Invalid JSON object", 400) });
  const tooLarge = () => ({ ok: false as const, response: jsonError("Request body too large", 413) });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { ok: false, response: jsonError("Expected application/json", 415) };
  }
  if (Number(request.headers.get("content-length")) > maxBytes) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return invalid();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    let bytes = 0;
    let content = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return tooLarge();
      }
      content += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(content + decoder.decode());
    if (!data || typeof data !== "object" || Array.isArray(data)) return invalid();
    return { ok: true, data };
  } catch {
    void reader.cancel().catch(() => {});
    return invalid();
  } finally {
    reader.releaseLock();
  }
}
