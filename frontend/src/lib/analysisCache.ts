interface CacheEntry {
  result: unknown;
  cachedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function getCacheKey(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCached(key: string, result: unknown, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { result, cachedAt: Date.now(), ttlMs });
}

export function getCacheSize(): number {
  return cache.size;
}

export function clearExpired(): number {
  let cleared = 0;
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > entry.ttlMs) {
      cache.delete(key);
      cleared++;
    }
  }
  return cleared;
}