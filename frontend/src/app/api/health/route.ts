import { getCacheSize, clearExpired } from "@/lib/analysisCache";

export async function GET() {
  const expiredCleared = clearExpired();
  const cacheSize = getCacheSize();

  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    cache: {
      entries: cacheSize,
      expiredCleared,
    },
    services: {
      gemini: true,
      tavily: true,
      supabase: true,
    }
  });
}