import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { jsonError } from "./apiErrors";

const policies = {
  analyze: [6, 8],
  "fetch-news": [20, 0],
  "extension-analyze": [10, 2],
  feedback: [6, 0],
} as const;

type Route = keyof typeof policies;
type Limit = { key: string; max: number; window: number; weight: number };

const consume = `
local now = tonumber(redis.call("TIME")[1])
local retry = 0
local updates = {}
for i, key in ipairs(KEYS) do
  local offset = (i - 1) * 3
  local window = tonumber(ARGV[offset + 1])
  local bucket = math.floor(now / window)
  local remaining = window - now % window
  local stored = redis.call("GET", key) or ""
  local savedBucket, savedCount = string.match(stored, "^(%d+):(%d+)$")
  local count = tonumber(savedBucket) == bucket and tonumber(savedCount) or 0
  count = count + tonumber(ARGV[offset + 3])
  if count > tonumber(ARGV[offset + 2]) then
    retry = math.max(retry, remaining)
  end
  updates[i] = { bucket .. ":" .. count, remaining }
end
if retry > 0 then return retry end
for i, key in ipairs(KEYS) do
  redis.call("SET", key, updates[i][1], "EX", updates[i][2])
end
return 0
`;

const local = new Map<string, { count: number; expires: number }>();

function consumeLocal(limits: Limit[], now: number) {
  for (const [key, entry] of local) {
    if (entry.expires <= now) local.delete(key);
  }
  let retry = 0;
  for (const { key, max, window, weight } of limits) {
    if ((local.get(key)?.count ?? 0) + weight > max) {
      retry = Math.max(retry, window - now % window);
    }
  }
  if (retry) return retry;
  for (const { key, window, weight } of limits) {
    local.set(key, { count: (local.get(key)?.count ?? 0) + weight, expires: now + window - now % window });
  }
  return 0;
}

export async function enforceRateLimit(request: Request, route: Route): Promise<Response | null> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const [max, weight] = policies[route];
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : null;
  const client = forwarded && isIP(forwarded) ? forwarded : "shared";
  const identity = createHmac("sha256", token || "local").update(client).digest("hex");
  const limits: Limit[] = [{ key: `polarity:{api-budget}:${route}:${identity}`, max, window: 60, weight: 1 }];
  if (weight) {
    limits.push({ key: "polarity:{api-budget}:gemini", max: 800, window: 86400, weight });
  } else {
    limits.push({ key: `polarity:{api-budget}:${route}`, max: route === "fetch-news" ? 3000 : 600, window: 86400, weight: 1 });
  }

  try {
    let retry: number;
    if (endpoint && token) {
      const target = new URL(endpoint);
      if (target.protocol !== "https:") throw new Error("Invalid rate limit endpoint");
      const response = await fetch(target, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          "EVAL", consume, limits.length, ...limits.map(({ key }) => key),
          ...limits.flatMap(({ window, max, weight }) => [window, max, weight]),
        ]),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw new Error("Rate limit backend failed");
      const { result } = await response.json();
      if (!Number.isSafeInteger(result) || result < 0 || result > 86400) {
        throw new Error("Invalid rate limit response");
      }
      retry = result;
    } else if (!endpoint && !token && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      retry = consumeLocal(limits, Math.floor(Date.now() / 1000));
    } else {
      throw new Error("Rate limit backend unavailable");
    }
    return retry ? jsonError("Too many requests. Try again later.", 429, {
      code: "RATE_LIMITED", headers: { "Retry-After": String(retry), "Cache-Control": "no-store" },
    }) : null;
  } catch {
    console.error("[rate-limit] backend unavailable", { route });
    return jsonError("Service temporarily unavailable", 503, {
      code: "RATE_LIMIT_UNAVAILABLE", headers: { "Retry-After": "30", "Cache-Control": "no-store" },
    });
  }
}
