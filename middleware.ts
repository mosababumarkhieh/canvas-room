import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cr_session")?.value;

  // Redirect to login if no session cookie on protected routes
  if (!token && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
