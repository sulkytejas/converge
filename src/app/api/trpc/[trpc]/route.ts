import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const handler = (req: NextRequest) => {
  // Shared with the tRPC context so procedures can append Set-Cookie /
  // arbitrary response headers; merged into the final Response via
  // responseMeta below. Needed because fetchRequestHandler constructs its
  // own Response and won't pick up mutations made through next/headers.
  const resHeaders = new Headers();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({ headers: req.headers, resHeaders }),
    responseMeta: () => ({ headers: resHeaders }),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
