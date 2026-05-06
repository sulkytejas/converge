import { NextResponse, type NextRequest } from "next/server";
import { verifySessionJwt } from "~/server/auth/jwt";

const SESSION_COOKIE = "cp_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate admin pages. The login page itself is unauthenticated.
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login" || pathname === "/admin") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionJwt(token) : null;
  if (!claims) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
