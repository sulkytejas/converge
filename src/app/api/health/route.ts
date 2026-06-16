import { NextResponse } from "next/server";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// App Platform health check — confirms the process is up AND the database is
// reachable, so a dead DB takes the instance out of rotation instead of serving
// errors. Point the App Platform health check at /api/health.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
