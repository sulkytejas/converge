import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  finance_mgr: "Finance Manager",
  finance_exec: "Finance Executive",
  ops_team_lead: "Ops Team Lead",
  ops_counselor: "Ops Counselor",
  bdm: "Business Development Manager",
  content_mgr: "Content Manager",
};

export const adminAuthRouter = createTRPCRouter({
  identify: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(1),
        countryCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      // Placeholder — in production, look up admin user by email + phone
      console.log("Admin identify:", input.email, input.countryCode + input.phone);
      return {
        success: true as const,
        maskedPhone: "****" + input.phone.slice(-4),
        maskedEmail:
          input.email[0] +
          "***" +
          input.email.substring(input.email.indexOf("@")),
      };
    }),

  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
      }),
    )
    .mutation(async ({ input }) => {
      // Placeholder — in production, verify OTP and return user info
      console.log("Admin verify OTP:", input.email, input.otp);

      const roleKey = "super_admin";
      return {
        success: true as const,
        name: "Admin User",
        email: input.email,
        role: roleKey,
        roleLabel: ROLE_LABELS[roleKey] ?? roleKey,
        roles: Object.entries(ROLE_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        lastLogin: null as string | null,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      // Placeholder — in production, create session with selected role
      console.log("Admin login:", input.email, "as", input.role);
      return { success: true as const, redirectUrl: "/" };
    }),
});
