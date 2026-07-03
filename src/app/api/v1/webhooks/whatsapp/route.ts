import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { phoneFromChatId, verifyWebhookSignature } from "~/server/periskope";
import { reconcileChatMessages } from "~/server/whatsapp-sync";

// Inbound Periskope WhatsApp webhook (registered at
// https://portal.convergeapp.co/api/v1/webhooks/whatsapp). We verify the HMAC
// signature, then use the event only as a TRIGGER: find which chat it concerns
// and re-pull that whole conversation from Periskope (the source of truth) via
// reconcileChatMessages — rather than parsing the event's own message fields.
// This is resilient to payload-shape quirks and naturally covers status updates.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Match a WhatsApp number to a student by its last 10 digits (tolerates the
// country-code / formatting differences between how we store phones and the id).
async function resolveStudentId(digits: string): Promise<number | null> {
  const last10 = digits.slice(-10);
  if (last10.length < 10) return null;
  const student = await db.student.findFirst({
    where: { phone: { contains: last10 } },
    select: { id: true },
  });
  return student?.id ?? null;
}

// Pull any WhatsApp chat id out of the raw payload — the structured field first,
// then a regex over the raw body as a fallback — so envelope/field-shape quirks
// can't stop us from finding which chat to resync.
function extractChatId(raw: string): string | null {
  try {
    const body = JSON.parse(raw) as { data?: unknown };
    const data: unknown =
      typeof body.data === "string"
        ? (JSON.parse(body.data) as unknown)
        : body.data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      const cid = d.chat_id ?? d.sender_phone;
      if (typeof cid === "string" && cid.length > 0) return cid;
    }
  } catch {
    /* fall through to the regex */
  }
  const m = /\d{6,}@[cg]\.us/.exec(raw);
  return m ? m[0] : null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-periskope-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const chatId = extractChatId(raw);
  if (!chatId) return NextResponse.json({ ok: true, ignored: "no chat id" });

  const studentId = await resolveStudentId(phoneFromChatId(chatId));
  if (!studentId) return NextResponse.json({ ok: true, matched: false });

  const synced = await reconcileChatMessages(studentId, chatId);
  return NextResponse.json({ ok: true, resynced: synced });
}
