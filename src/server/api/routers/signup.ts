import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  sendEmailOtp,
  sendPhoneOtp,
  toE164,
  verifyEmailOtp,
  verifyPhoneOtp,
} from "~/server/otp";
import { saveApplication } from "~/server/applications/store";
import { notifyAdminOfSignup } from "~/server/notifications";

export const signupRouter = createTRPCRouter({
  sendSignupOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(1),
        countryCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
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

      return {
        success: true as const,
        emailSent: results[0]!.status === "fulfilled",
        phoneSent: results[1]!.status === "fulfilled",
      };
    }),

  verifyEmailOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(5),
      }),
    )
    .mutation(async ({ input }) => {
      const ok = await verifyEmailOtp(input.email, input.otp);
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }
      return { verified: true as const };
    }),

  verifyPhoneOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(1),
        countryCode: z.string().min(1),
        otp: z.string().length(5),
      }),
    )
    .mutation(async ({ input }) => {
      const phoneE164 = toE164(input.phone, input.countryCode);
      const ok = await verifyPhoneOtp(phoneE164, input.otp);
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
      }
      return { verified: true as const };
    }),

  submitApplication: publicProcedure
    .input(
      z.object({
        role: z.enum(["agency", "independent"]),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        countryCode: z.string().min(1),
        // Agency-specific fields
        companyName: z.string().optional(),
        companyWebsite: z.string().optional(),
        country: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        companyAddress: z.string().optional(),
        numCounselors: z.string().optional(),
        annualVolume: z.string().optional(),
        // Map of document key -> stored file URL (e.g. "/uploads/...")
        documents: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const app = saveApplication({
        email: input.email,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        countryCode: input.countryCode,
        companyName: input.companyName,
        companyWebsite: input.companyWebsite,
        country: input.country,
        state: input.state,
        city: input.city,
        companyAddress: input.companyAddress,
        numCounselors: input.numCounselors,
        annualVolume: input.annualVolume,
        documents: input.documents,
      });

      notifyAdminOfSignup(app).catch((err) => {
        console.error("Admin notification failed:", err);
      });

      return {
        applicationId: app.applicationId,
        status: app.status,
      };
    }),
});
