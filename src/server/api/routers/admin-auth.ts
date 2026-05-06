import { z } from "zod";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { sendPhoneOtp, toE164, verifyPhoneOtp } from "~/server/otp";
import { SESSION_COOKIE_NAME, signSessionJwt } from "~/server/auth/jwt";

// Phone is stored as `${countryCode}${phone}` (e.g. "+919876543210"). When the
// country code starts with "+", we treat the trailing 10 chars as the local
// number and everything before as the country code.
function splitPhone(stored: string): { phone: string; countryCode: string } {
  if (stored.startsWith("+") && stored.length > 10) {
    const cc = stored.slice(0, stored.length - 10);
    return { countryCode: cc, phone: stored.slice(cc.length) };
  }
  return { countryCode: "", phone: stored };
}

// Admin login: identifies the user by email against `collegepond_user`,
// requires the registered phone to match, and uses phone OTP only.
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
      const user = await db.collegepond_user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      // Single generic error to avoid leaking which side mismatched.
      const mismatchError = new TRPCError({
        code: "NOT_FOUND",
        message: "Email and phone combination not found. Contact IT support.",
      });
      if (!user) throw mismatchError;
      if (user.status !== 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This account is deactivated. Contact IT support.",
        });
      }

      const stored = splitPhone(user.phone);
      const providedE164 = toE164(input.phone, input.countryCode);
      const storedE164 = toE164(stored.phone, stored.countryCode);
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
      const user = await db.collegepond_user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No account found" });
      }
      if (user.status !== 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This account is deactivated. Contact IT support.",
        });
      }

      const stored = splitPhone(user.phone);
      const providedE164 = toE164(input.phone, input.countryCode);
      const storedE164 = toE164(stored.phone, stored.countryCode);
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

      await db.collegepond_user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      const token = await signSessionJwt({ id: user.id, role: user.role });
      const jar = await cookies();
      jar.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // 8h, must match the JWT TTL.
        maxAge: 60 * 60 * 8,
      });

      // The admin login page expects status === "approved" for the success
      // redirect; collegepond_user has no pending state, so an active row
      // maps to "approved" here.
      return {
        success: true as const,
        name: user.first_name,
        status: "approved" as const,
        applicationId: String(user.id),
      };
    }),
});
