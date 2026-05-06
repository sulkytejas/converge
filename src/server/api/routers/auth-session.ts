import { cookies } from "next/headers";
import { createTRPCRouter, protectedAdminProcedure, publicProcedure } from "~/server/api/trpc";
import { SESSION_COOKIE_NAME } from "~/server/auth/jwt";
import { db } from "~/server/db";

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

  logout: protectedAdminProcedure.mutation(async () => {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE_NAME);
    return { success: true as const };
  }),
});
