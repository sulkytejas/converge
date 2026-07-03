import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  ackToStatus,
  chatIdForPhone,
  fetchChatMessages,
  periskopeConfigured,
  sendWhatsappMessage,
} from "~/server/periskope";

// Student ↔ counsellor WhatsApp thread (via Periskope). The DB is the store; the
// thread reads from it (instant load). sync() pulls the live conversation from
// Periskope (source of truth) and reconciles it into the DB, so the thread stays
// correct on open even if a webhook event was missed; the webhook still pushes
// real-time updates into the same store. Outbound is sent + stored immediately.

// Normalize a Periskope timestamp ("2024-05-13 11:19:34+00") to a JS Date.
function periskopeTs(ts: string | null): Date {
  if (!ts) return new Date(0);
  const s = ts.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export const chatRouter = createTRPCRouter({
  configured: protectedAdminProcedure.query(() => ({ configured: periskopeConfigured() })),

  thread: protectedAdminProcedure
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const rows = await db.whatsapp_message.findMany({
        where: { student_id: input.studentId },
        orderBy: { created_at: "asc" },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        fromMe: r.from_me === 1,
        body: r.body ?? "",
        type: r.message_type ?? "text",
        status: r.status,
        at: (r.provider_ts ?? r.created_at).toISOString(),
      }));
    }),

  // Reconcile the DB with Periskope's copy of the conversation (source-of-truth
  // sync on chat open). Idempotent: dedups on Periskope's message_id AND on the
  // short unique_id our own sent rows stored, so it never duplicates. One read +
  // one batched insert + a few status updates — cheap, and the client runs it
  // WITHOUT blocking the thread render.
  sync: protectedAdminProcedure
    .input(z.object({ studentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const student = await db.student.findUnique({
        where: { id: input.studentId },
        select: { id: true, phone: true },
      });
      if (!student?.phone?.trim() || !periskopeConfigured()) return { synced: 0 };

      const chatId = chatIdForPhone(student.phone);
      const msgs = await fetchChatMessages(chatId, 200);
      if (!msgs) return { synced: 0 };

      const existing = await db.whatsapp_message.findMany({
        where: { student_id: student.id },
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
            student_id: student.id,
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
      return { synced: toCreate.length + updated };
    }),

  send: protectedAdminProcedure
    .input(
      z.object({
        studentId: z.number().int().positive(),
        message: z.string().trim().min(1).max(4096),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await db.student.findUnique({
        where: { id: input.studentId },
        select: { id: true, phone: true },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      if (!student.phone?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This student has no phone number on file." });
      }

      const chatId = chatIdForPhone(student.phone);
      const result = await sendWhatsappMessage(chatId, input.message);
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Couldn't send WhatsApp message: ${result.error}` });
      }

      const row = await db.whatsapp_message.create({
        data: {
          student_id: student.id,
          chat_id: chatId,
          provider_message_id: result.providerMessageId,
          from_me: 1,
          body: input.message,
          message_type: "text",
          sent_by_cp_user_id: ctx.cpUser.id,
          status: result.status ?? "queued",
        },
      });
      return {
        id: row.id,
        fromMe: true,
        body: input.message,
        type: "text",
        status: row.status,
        at: row.created_at.toISOString(),
      };
    }),
});
