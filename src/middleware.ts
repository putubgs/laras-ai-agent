import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    try {
      await verifySessionToken(token);
      return NextResponse.next();
    } catch {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  if ((pathname === "/login" || pathname === "/register") && token) {
    try {
      await verifySessionToken(token);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      const res = NextResponse.next();
      res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
