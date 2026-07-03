import { db } from "~/server/db";
import { ackToStatus, fetchChatMessages } from "~/server/periskope";

// Normalize a Periskope timestamp ("2024-05-13 11:19:34+00") to a JS Date.
function periskopeTs(ts: string | null): Date {
  if (!ts) return new Date(0);
  const s = ts.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Pull the live conversation from Periskope (the source of truth) and reconcile
 * it into `whatsapp_message`. Idempotent: dedups on Periskope's `message_id` AND
 * on the short `unique_id` our own sent rows stored, and maps the WhatsApp ack
 * (0–4) to our status label. Returns the number of rows created + updated.
 *
 * Shared by chat.sync (on chat open / interval) and the inbound webhook (which
 * uses the event only as a trigger to re-pull, rather than parsing its payload).
 */
export async function reconcileChatMessages(
  studentId: number,
  chatId: string,
): Promise<number> {
  const msgs = await fetchChatMessages(chatId, 200);
  if (!msgs) return 0;

  const existing = await db.whatsapp_message.findMany({
    where: { student_id: studentId },
    select: { id: true, provider_message_id: true, status: true },
  });
  const byPid = new Map<string, { id: number; status: string | null }>();
  for (const r of existing) {
    if (r.provider_message_id) {
      byPid.set(r.provider_message_id, { id: r.id, status: r.status });
    }
  }

  const toCreate: Array<{
    student_id: number;
    chat_id: string;
    provider_message_id: string | null;
    from_me: number;
    body: string | null;
    message_type: string;
    status: string;
    provider_ts: Date;
  }> = [];
  let updated = 0;

  for (const m of msgs) {
    const status = m.fromMe ? ackToStatus(m.ack) : "received";
    const found =
      (m.messageId ? byPid.get(m.messageId) : undefined) ??
      (m.uniqueId ? byPid.get(m.uniqueId) : undefined);
    if (found) {
      if (found.status !== status) {
        await db.whatsapp_message.update({
          where: { id: found.id },
          data: { status, provider_ts: periskopeTs(m.timestamp) },
        });
        updated++;
      }
    } else {
      toCreate.push({
        student_id: studentId,
        chat_id: chatId,
        provider_message_id: m.messageId ?? m.uniqueId,
        from_me: m.fromMe ? 1 : 0,
        body: m.body,
        message_type: m.messageType ?? "text",
        status,
        provider_ts: periskopeTs(m.timestamp),
      });
    }
  }

  if (toCreate.length > 0) {
    await db.whatsapp_message.createMany({ data: toCreate, skipDuplicates: true });
  }
  return toCreate.length + updated;
}
