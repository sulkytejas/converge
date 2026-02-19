import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
      // Placeholder — in production, send OTP via email/SMS
      console.log("Sending login OTP to", input.email, input.countryCode + input.phone);
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
      // Placeholder — in production, verify OTP
      console.log("Verifying login OTP for", input.email, "OTP:", input.otp);
      return { success: true as const, name: "User" };
    }),
});
