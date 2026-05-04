import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  sendPhoneOtp,
  toE164,
  verifyPhoneOtp,
} from "~/server/otp";
import {
  getApplicationByEmail,
  setApplicationStatus,
} from "~/server/applications/store";

// Admin login: identifies the user by email, requires the registered phone to
// match, and uses phone OTP only (no email OTP).
export const adminAuthRouter = createTRPCRouter({
  sendLoginOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(1),
        countryCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const app = await getApplicationByEmail(input.email);
      // Single generic error to avoid leaking which side mismatched.
      const mismatchError = new TRPCError({
        code: "NOT_FOUND",
        message: "Email and phone combination not found. Contact IT support.",
      });
      if (!app) throw mismatchError;

      const providedE164 = toE164(input.phone, input.countryCode);
      const storedE164 = toE164(app.phone, app.countryCode);
      if (providedE164 !== storedE164) throw mismatchError;

      try {
        await sendPhoneOtp(providedE164);
      } catch {
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
        countryCode: z.string().min(1),
        otp: z.string().length(5),
      }),
    )
    .mutation(async ({ input }) => {
      const app = await getApplicationByEmail(input.email);
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found",
        });
      }

      const providedE164 = toE164(input.phone, input.countryCode);
      const storedE164 = toE164(app.phone, app.countryCode);
      if (providedE164 !== storedE164) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Phone number does not match this account",
        });
      }

      const ok = await verifyPhoneOtp(providedE164, input.otp);
      if (!ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired OTP",
        });
      }

      return {
        success: true as const,
        name: app.firstName,
        status: app.status,
        applicationId: app.applicationId,
      };
    }),

  // DEV-ONLY: flips an applicant's status without a real admin UI.
  // Replace with a protected mutation (proper auth + audit log) when admin UI lands.
  approveApplication: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        status: z.enum(["approved", "rejected", "under_review"]).default("approved"),
      }),
    )
    .mutation(async ({ input }) => {
      const app = await setApplicationStatus(input.email, input.status);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }
      return { success: true as const, status: app.status };
    }),
});
