import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_API_URL = "https://giga-shop-api.onrender.com";
const FETCH_TIMEOUT_MS = 45_000;

function resolveApiBaseUrl(): string {
  return (
    process.env.KEEP_ALIVE_API_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    DEFAULT_API_URL
  );
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Vercel Cron hits this route to wake Render API and run Postgres `SELECT 1`
 * (Supabase free tier pauses after ~7 days without DB activity).
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = resolveApiBaseUrl();
  const startedAt = Date.now();

  try {
    const response = await fetch(`${apiUrl}/health/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body = (await response.json()) as {
      status?: string;
      checks?: { database?: { status?: string } };
    };

    const ok = response.ok && body.status === "ok";

    return NextResponse.json(
      {
        ok,
        apiUrl,
        durationMs: Date.now() - startedAt,
        upstreamStatus: response.status,
        database: body.checks?.database?.status ?? "unknown",
      },
      { status: ok ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        apiUrl,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "keep-alive failed",
      },
      { status: 502 },
    );
  }
}
