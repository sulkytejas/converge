import { createHmac, timingSafeEqual } from "node:crypto";

// Periskope WhatsApp API. Send is a REST call; inbound messages arrive on the
// webhook (see /api/v1/webhooks/whatsapp). Keys live in env — never read here as
// values beyond handing them to the API / HMAC.
//
//   PERISKOPE_API_KEY      — Bearer token for the REST API (required)
//   PERISKOPE_WEBHOOK_KEY  — HMAC secret to verify inbound webhooks (required)
//   PERISKOPE_PHONE        — the connected sender number for the x-phone header
//                            (optional; add only if the API asks for it)
//   PERISKOPE_API_URL      — base URL override (defaults to the documented one)

const BASE_URL = process.env.PERISKOPE_API_URL ?? "https://api.periskope.app/v1";

export function periskopeConfigured(): boolean {
  return !!process.env.PERISKOPE_API_KEY;
}

// Any phone format → Periskope 1-1 chat id, e.g. "919820011234@c.us".
export function chatIdForPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@c.us`;
}
// "919820011234@c.us" → "919820011234" (also tolerates a bare number).
export function phoneFromChatId(chatId: string): string {
  return chatId.split("@")[0]!.replace(/\D/g, "");
}

const asRecord = (text: string): Record<string, unknown> | null => {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export type SendResult =
  | { ok: true; providerMessageId: string | null; status: string | null }
  | { ok: false; error: string };

export async function sendWhatsappMessage(chatId: string, message: string): Promise<SendResult> {
  const apiKey = process.env.PERISKOPE_API_KEY;
  if (!apiKey) return { ok: false, error: "WhatsApp isn't configured (PERISKOPE_API_KEY missing)." };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (process.env.PERISKOPE_PHONE) headers["x-phone"] = process.env.PERISKOPE_PHONE;

  try {
    const res = await fetch(`${BASE_URL}/message/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ chat_id: chatId, message }),
    });
    const text = await res.text();
    const json = asRecord(text);
    if (!res.ok) {
      return { ok: false, error: str(json?.message) ?? str(json?.error) ?? (text || `HTTP ${res.status}`) };
    }
    return {
      ok: true,
      providerMessageId: str(json?.unique_id) ?? str(json?.queue_id),
      status: str(json?.status) ?? "queued",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reach WhatsApp provider" };
  }
}

// Verify the inbound webhook's x-periskope-signature header:
// HMAC-SHA256(rawBody, PERISKOPE_WEBHOOK_KEY) as hex, timing-safe compared.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PERISKOPE_WEBHOOK_KEY;
  if (!key || !signature) return false;
  const digest = createHmac("sha256", key).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
