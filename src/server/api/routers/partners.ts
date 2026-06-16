import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { env } from "~/env";
import { emailConfigured, sendTemplatedEmail } from "~/server/email";
import {
  listApplications,
  setApplicationStatus,
  setDocumentStatus,
} from "~/server/applications/store";

const partnerStatus = z.enum([
  "under_review",
  "approved",
  "rejected",
  "inactive",
]);

const docStatus = z.enum(["pending", "approved", "rejected"]);

export const partnersRouter = createTRPCRouter({
  list: protectedAdminProcedure.query(async () => {
    return listApplications();
  }),

  setStatus: protectedAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        status: partnerStatus,
      }),
    )
    .mutation(async ({ input }) => {
      const app = await setApplicationStatus(input.email, input.status);
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner application not found",
        });
      }
      return app;
    }),

  // After approval, assign a lead counsellor + counsellor (both rows from
  // collegepond_user) onto the partner's user row. Either side can be null
  // if the admin wants to skip and assign later.
  assignCounsellors: protectedAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        leadCounsellorId: z.number().int().positive().nullable(),
        counsellorId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner not found",
        });
      }
      await db.user.update({
        where: { id: user.id },
        data: {
          lead_counsellor_id: input.leadCounsellorId,
          counsellor_id: input.counsellorId,
        },
      });
      return { success: true as const };
    }),

  setDocumentStatus: protectedAdminProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        status: docStatus,
      }),
    )
    .mutation(async ({ input }) => {
      await setDocumentStatus(input.documentId, input.status);
      return { success: true as const };
    }),

  // Email delivery is intentionally not wired yet — the admin UI lets you
  // compose the request; we log it server-side until the email provider is
  // hooked up. Partner status is left unchanged.
  requestMoreInfo: protectedAdminProcedure
    .input(
      z
        .object({
          email: z.string().email(),
          items: z.array(z.string().min(1)).default([]),
          otherText: z.string().optional(),
          additionalMessage: z.string().optional(),
        })
        .refine(
          (v) =>
            v.items.length > 0 ||
            (v.otherText?.trim().length ?? 0) > 0 ||
            (v.additionalMessage?.trim().length ?? 0) > 0,
          { message: "Pick at least one item or add a message" },
        ),
    )
    .mutation(async ({ input }) => {
      // Email the partner via MSG91 when a template is configured; otherwise log
      // a MINIMAL, non-PII event (never the email/message body).
      if (env.MSG91_MOREINFO_TEMPLATE_ID && emailConfigured()) {
        try {
          await sendTemplatedEmail({
            to: input.email,
            templateId: env.MSG91_MOREINFO_TEMPLATE_ID,
            variables: {
              items: input.items.join(", "),
              other: input.otherText?.trim() ?? "",
              message: input.additionalMessage?.trim() ?? "",
            },
          });
          return { success: true as const };
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send the request email.",
          });
        }
      }
      console.log(
        `[Partners] More-info request queued (${input.items.length} item(s)); set MSG91_MOREINFO_TEMPLATE_ID to email partners.`,
      );
      return { success: true as const };
    }),
});
