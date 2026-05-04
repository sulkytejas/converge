import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { UserStatus, UserType } from "~/server/db/enums";

function generateTrackingId(): string {
  return `#CP-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 999999),
  ).padStart(6, "0")}`;
}

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

const adminUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  status: true,
  last_login_at: true,
  created_at: true,
  tracking_id: true,
} as const;

interface DbAdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: number;
  last_login_at: Date | null;
  created_at: Date;
  tracking_id: string | null;
}

function toApi(u: DbAdminUser) {
  const { phone, countryCode } = splitPhone(u.phone);
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone,
    countryCode,
    status: u.status === UserStatus.APPROVED ? ("active" as const) : ("inactive" as const),
    lastLogin: u.last_login_at?.toISOString() ?? null,
    createdAt: u.created_at.toISOString(),
    trackingId: u.tracking_id ?? "",
  };
}

const personFields = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phone: z.string().min(1),
  countryCode: z.string().min(1),
});

export const usersRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const rows = await db.user.findMany({
      where: { type: UserType.ADMIN },
      orderBy: { created_at: "desc" },
      select: adminUserSelect,
    });
    return rows.map(toApi);
  }),

  create: publicProcedure.input(personFields).mutation(async ({ input }) => {
    const email = input.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists.",
      });
    }

    const phoneStored = `${input.countryCode}${input.phone.replace(/\s/g, "")}`;

    const user = await db.user.create({
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        email,
        phone: phoneStored,
        type: UserType.ADMIN,
        status: UserStatus.APPROVED,
        is_owner: 0,
        is_email_verified: 1,
        is_phone_verified: 1,
        tracking_id: generateTrackingId(),
      },
      select: adminUserSelect,
    });

    return toApi(user);
  }),

  update: publicProcedure
    .input(personFields.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();

      const dup = await db.user.findUnique({ where: { email } });
      if (dup && dup.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const phoneStored = `${input.countryCode}${input.phone.replace(/\s/g, "")}`;

      const user = await db.user.update({
        where: { id: input.id },
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          email,
          phone: phoneStored,
        },
        select: adminUserSelect,
      });

      return toApi(user);
    }),

  setStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.update({
        where: { id: input.id },
        data: {
          status: input.active ? UserStatus.APPROVED : UserStatus.INACTIVE,
        },
        select: adminUserSelect,
      });
      return toApi(user);
    }),
});
