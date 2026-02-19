import { postRouter } from "~/server/api/routers/post";
import { authRouter } from "~/server/api/routers/auth";
import { signupRouter } from "~/server/api/routers/signup";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  auth: authRouter,
  signup: signupRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
