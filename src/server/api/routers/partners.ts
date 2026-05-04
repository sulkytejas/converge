import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
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
  list: publicProcedure.query(async () => {
    return listApplications();
  }),

  setStatus: publicProcedure
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

  setDocumentStatus: publicProcedure
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
  requestMoreInfo: publicProcedure
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
            (v.otherText && v.otherText.trim().length > 0) ||
            (v.additionalMessage && v.additionalMessage.trim().length > 0),
          { message: "Pick at least one item or add a message" },
        ),
    )
    .mutation(async ({ input }) => {
      const lines: string[] = [
        `[Partners] Request more info → ${input.email}`,
        `Items: ${input.items.length ? input.items.join(", ") : "(none)"}`,
      ];
      if (input.otherText?.trim()) lines.push(`Other: ${input.otherText.trim()}`);
      if (input.additionalMessage?.trim())
        lines.push(`Message: ${input.additionalMessage.trim()}`);
      console.log(lines.join("\n"));
      return { success: true as const };
    }),
});
