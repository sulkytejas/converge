import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";

// Inbound RazorpayX webhook — captures the *final* payout outcome (UTR + settled
// status) after release. The release call only gets the initial state (usually
// "queued"/"processing"); the bank confirms minutes-to-hours later and RazorpayX
// posts payout.processed / payout.reversed / payout.failed here.
//
// Security: every request is HMAC-SHA256 signed with the secret configured on the
// RazorpayX webhook (Dashboard → Settings → Webhooks). We verify the raw body
// against the X-Razorpay-Signature header before trusting anything. If
// RAZORPAY_WEBHOOK_SECRET is unset the endpoint is disabled (503), so it can't be
// hit blindly while keys aren't configured.
//
// This intentionally updates only provider_status + utr — it does NOT auto-revert
// our internal PayoutStatus on failure/reversal. Money already left on a RELEASED
// payout; un-releasing it is a Finance decision, so a failed/reversed event is
// surfaced (provider_status + a server warning) for an operator to reconcile,
// not silently rolled back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RzpPayoutEntity {
  id?: string;
  status?: string;
  utr?: string | null;
  reference_id?: string | null;
}
interface RzpWebhookBody {
  event?: string;
  payload?: { payout?: { entity?: RzpPayoutEntity } };
}

function verifySignature(raw: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // timingSafeEqual throws on length mismatch — guard so a wrong-length sig is a
  // clean false, not a 500.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature || !verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: RzpWebhookBody;
  try {
    body = JSON.parse(raw) as RzpWebhookBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = body.event ?? "";
  const entity = body.payload?.payout?.entity;

  // We only act on payout lifecycle events; ack everything else (200) so RazorpayX
  // stops retrying.
  if (!event.startsWith("payout.") || !entity?.id) {
    return NextResponse.json({ ok: true, ignored: event || "unknown" });
  }

  // Match the payout we recorded at release time. Primary key is the provider id;
  // fall back to the reference_id we set ("payout_<id>") for resilience.
  const refId = entity.reference_id?.match(/^payout_(\d+)$/)?.[1];
  const payout = await db.partner_payout.findFirst({
    where: refId
      ? { OR: [{ provider_payout_id: entity.id }, { id: Number(refId) }] }
      : { provider_payout_id: entity.id },
    select: { id: true },
  });

  if (!payout) {
    // Unknown payout — ack so RazorpayX doesn't retry forever, but log it.
    console.warn(`[razorpayx-webhook] ${event} for unknown payout ${entity.id}`);
    return NextResponse.json({ ok: true, matched: false });
  }

  await db.partner_payout.update({
    where: { id: payout.id },
    data: {
      provider_status: entity.status ?? null,
      ...(entity.utr ? { utr: entity.utr, reference_number: entity.utr } : {}),
    },
  });

  if (event === "payout.reversed" || event === "payout.failed") {
    console.warn(
      `[razorpayx-webhook] payout ${payout.id} (${entity.id}) ${event} — money did not settle; needs Finance reconciliation`,
    );
  }

  return NextResponse.json({ ok: true, matched: true, payoutId: payout.id });
}
