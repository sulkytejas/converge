import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  sendEmailOtp,
  sendPhoneOtp,
  toE164,
  verifyEmailOtp,
} from "~/server/otp";
import { getApplicationByEmail } from "~/server/applications/store";

export const authRouter = createTRPCRouter({
  sendLoginOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(1),
        countryCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const app = getApplicationByEmail(input.email);
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found for this email. Please sign up first.",
        });
      }

      const phoneE164 = toE164(input.phone, input.countryCode);
      const results = await Promise.allSettled([
        sendEmailOtp(input.email),
        sendPhoneOtp(phoneE164),
      ]);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === results.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP",
        });
      }

      return { success: true as const };
    }),

  verifyLoginOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(1),
        otp: z.string().length(5),
      }),
    )
    .mutation(async ({ input }) => {
      const ok = await verifyEmailOtp(input.email, input.otp);
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }

      const app = getApplicationByEmail(input.email);
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found for this email",
        });
      }

      return {
        success: true as const,
        name: app.firstName,
        status: app.status,
        applicationId: app.applicationId,
      };
    }),
});
