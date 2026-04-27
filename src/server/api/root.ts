import { authRouter } from "~/server/api/routers/auth";
import { signupRouter } from "~/server/api/routers/signup";
import { adminAuthRouter } from "~/server/api/routers/admin-auth";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  signup: signupRouter,
  adminAuth: adminAuthRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
