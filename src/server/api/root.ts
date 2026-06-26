import { accountRouter } from "~/server/api/routers/account";
import { authRouter } from "~/server/api/routers/auth";
import { authSessionRouter } from "~/server/api/routers/auth-session";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { signupRouter } from "~/server/api/routers/signup";
import { adminAuthRouter } from "~/server/api/routers/admin-auth";
import { usersRouter } from "~/server/api/routers/users";
import { partnersRouter } from "~/server/api/routers/partners";
import { universitiesRouter } from "~/server/api/routers/universities";
import { studentsRouter } from "~/server/api/routers/students";
import { placementsRouter } from "~/server/api/routers/placements";
import { counsellorsRouter } from "~/server/api/routers/counsellors";
import { eventsRouter } from "~/server/api/routers/events";
import { commissionRatesRouter } from "~/server/api/routers/commission-rates";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  auth: authRouter,
  authSession: authSessionRouter,
  signup: signupRouter,
  adminAuth: adminAuthRouter,
  users: usersRouter,
  partners: partnersRouter,
  universities: universitiesRouter,
  students: studentsRouter,
  placements: placementsRouter,
  counsellors: counsellorsRouter,
  events: eventsRouter,
  commissionRates: commissionRatesRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
