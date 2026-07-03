import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { SESSION_COOKIE_NAME } from "~/server/auth/jwt";
import { db } from "~/server/db";

// Expire the admin session cookie (same name + Path as the login cookie). Must be
// emitted via ctx.resHeaders: next/headers cookies().delete() is dropped by the
// tRPC fetch handler and never reaches the browser, so the session would survive.
function clearSessionCookie(): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

// Session-side router: who am I, and let me sign out. Distinct from the auth
// flow router (`auth`) used by the partner side.
export const authSessionRouter = createTRPCRouter({
  // Returns the current admin (collegepond_user) if signed in, else null.
  // Public on purpose so the client can call it without erroring on logged-out
  // users; gating is done by the consumer (e.g. middleware redirects).
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.cpUser) return null;
    const user = await db.collegepond_user.findUnique({
      where: { id: ctx.cpUser.id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
      },
    });
    if (user?.status !== 1) return null;
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
    };
  }),

  // Public so a stale/expired cookie doesn't 401 the logout itself. Clears the
  // cookie via ctx.resHeaders so the Set-Cookie actually reaches the browser.
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.resHeaders.append("Set-Cookie", clearSessionCookie());
    return { success: true as const };
  }),
});
