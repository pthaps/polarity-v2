import { NextResponse } from "next/server";

type ReadJsonOptions = {
  /** Extra headers on 400 (e.g. CORS for extension routes) */
  invalidJsonHeaders?: HeadersInit;
  /** Override default invalid-JSON message */
  invalidJsonMessage?: string;
};

/**
 * Safe JSON body parse for Route Handlers — returns 400 instead of 500 on malformed JSON.
 */
export async function readJsonBody<T>(
  request: Request,
  options?: ReadJsonOptions
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options?.invalidJsonMessage ?? "Invalid JSON body" },
        { status: 400, headers: options?.invalidJsonHeaders }
      ),
    };
  }
}
