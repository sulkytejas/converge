import { NextResponse } from "next/server";
import { refreshFxRates } from "~/server/api/routers/fx";

// Scheduled FX refresh for an external scheduler (a DigitalOcean scheduled job,
// GitHub Action, cron-job.org, …). Protect it with a shared secret:
//   - set CRON_SECRET in the environment, and
//   - call GET /api/cron/fx with `Authorization: Bearer <secret>` (or `?secret=`).
// If CRON_SECRET is unset the endpoint is disabled (503), so it can't be hit blindly.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await refreshFxRates();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "FX refresh failed" }, { status: 502 });
  }
}
