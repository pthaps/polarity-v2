import { NextResponse } from "next/server";

type JsonErrorOptions = {
  code?: string;
  headers?: HeadersInit;
  details?: string;
};

/**
 * Consistent JSON error responses for Route Handlers (message + optional machine code for clients).
 */
export function jsonError(
  message: string,
  status: number,
  options?: JsonErrorOptions
): NextResponse {
  const body: Record<string, string> = { error: message };
  if (options?.code) body.code = options.code;
  if (options?.details) body.details = options.details;
  return NextResponse.json(body, { status, headers: options?.headers });
}

export function logRouteError(route: string, e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[api/${route}]`, msg, e);
}
