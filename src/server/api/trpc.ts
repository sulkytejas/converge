/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";
import {
  PARTNER_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  verifyPartnerSessionJwt,
  verifySessionJwt,
} from "~/server/auth/jwt";
import { AdminRole } from "~/server/db/enums";

interface CpUser {
  id: number;
  role: number;
}

interface CpPartner {
  id: number;
}

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export const createTRPCContext = async (opts: {
  headers: Headers;
  resHeaders: Headers;
}) => {
  let cpUser: CpUser | null = null;
  const adminToken = readCookie(opts.headers, SESSION_COOKIE_NAME);
  if (adminToken) {
    cpUser = await verifySessionJwt(adminToken);
  }

  let cpPartner: CpPartner | null = null;
  const partnerToken = readCookie(opts.headers, PARTNER_SESSION_COOKIE_NAME);
  if (partnerToken) {
    cpPartner = await verifyPartnerSessionJwt(partnerToken);
  }

  return {
    db,
    cpUser,
    cpPartner,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

// Requires a valid admin (collegepond_user) session cookie.
export const protectedAdminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.cpUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  return next({ ctx: { ...ctx, cpUser: ctx.cpUser } });
});

// Further requires the admin to have role = SUPER_ADMIN.
export const superAdminProcedure = protectedAdminProcedure.use(({ ctx, next }) => {
  if (ctx.cpUser.role !== AdminRole.SUPER_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super admins can perform this action.",
    });
  }
  return next();
});

// Requires a valid partner (user table) session cookie.
export const protectedPartnerProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.cpPartner) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  return next({ ctx: { ...ctx, cpPartner: ctx.cpPartner } });
});
