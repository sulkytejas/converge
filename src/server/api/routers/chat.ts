import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  chatIdForPhone,
  periskopeConfigured,
  sendWhatsappMessage,
} from "~/server/periskope";

// Student ↔ counsellor WhatsApp thread (via Periskope). Outbound goes through
// the API and is stored immediately; inbound arrives on the webhook. The UI
// polls thread() for new messages.
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
