import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
      console.log("Sending signup OTP to", input.email, input.countryCode + input.phone);
      return { success: true as const };
    }),

  verifyEmailOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(5),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("Verifying email OTP for", input.email, "OTP:", input.otp);
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
      console.log("Verifying phone OTP for", input.countryCode + input.phone, "OTP:", input.otp);
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
        // Document names (just names for placeholder)
        documents: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("Submitting application for", input.firstName, input.lastName);
      const applicationId = `#CP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;
      return {
        applicationId,
        status: "under_review" as const,
      };
    }),
});
