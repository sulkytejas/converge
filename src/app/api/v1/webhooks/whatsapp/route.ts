import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { phoneFromChatId, verifyWebhookSignature } from "~/server/periskope";

// Inbound Periskope WhatsApp webhook (registered at
// https://portal.convergeapp.co/api/v1/webhooks/whatsapp). Fires on
// `message.created` for every message sent or received. We verify the HMAC
// signature, then store the message on the matching student's thread. Our own
// outgoing messages come back here too (from_me=true) — we dedup on the
// provider message id so they aren't doubled.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InboundMessage {
  message_id?: string;
  chat_id?: string;
  from?: string;
  sender_phone?: string;
  body?: string;
  from_me?: boolean;
  message_type?: string;
  timestamp?: string;
}
interface WebhookBody {
  event?: string;
  data?: InboundMessage;
}

// Match a WhatsApp number to a student by its last 10 digits (tolerates the
// country-code/formatting differences between how we store phones and the
// chat id). Null if no student matches — the message is still stored, unlinked.
async function resolveStudentId(digits: string): Promise<number | null> {
  const last10 = digits.slice(-10);
  if (last10.length < 10) return null;
  const student = await db.student.findFirst({
    where: { phone: { contains: last10 } },
    select: { id: true },
  });
  return student?.id ?? null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-periskope-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Ack anything that isn't a message so Periskope stops retrying.
  if (body.event !== "message.created" || !body.data) {
    return NextResponse.json({ ok: true, ignored: body.event ?? "unknown" });
  }

  const m = body.data;
  const chatId = m.chat_id ?? "";
  // First non-empty of the chat id / sender fields (empty strings fall through).
  const source = [chatId, m.sender_phone, m.from].find((v) => v != null && v.length > 0) ?? "";
  const phone = phoneFromChatId(source);
  if (!chatId && !phone) {
    return NextResponse.json({ ok: true, ignored: "no chat id" });
  }

  const providerId = m.message_id ?? null;
  const fromMe = m.from_me ? 1 : 0;
  const providerTs = m.timestamp ? new Date(m.timestamp) : null;

  // Dedup: our own sent messages already have a row keyed by this provider id —
  // update its status instead of inserting a duplicate.
  if (providerId) {
    const existing = await db.whatsapp_message.findUnique({
      where: { provider_message_id: providerId },
      select: { id: true },
    });
    if (existing) {
      await db.whatsapp_message.update({
        where: { id: existing.id },
        data: { status: "delivered", ...(providerTs ? { provider_ts: providerTs } : {}) },
      });
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  const studentId = phone ? await resolveStudentId(phone) : null;
  await db.whatsapp_message.create({
    data: {
      student_id: studentId,
      chat_id: chatId || `${phone}@c.us`,
      provider_message_id: providerId,
      from_me: fromMe,
      body: m.body ?? null,
      message_type: m.message_type ?? "text",
      status: "received",
      provider_ts: providerTs,
    },
  });

  if (!studentId) {
    console.warn(`[whatsapp-webhook] message from ${phone} matched no student`);
  }
  return NextResponse.json({ ok: true, matched: studentId != null });
}
