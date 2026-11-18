import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  HOME_PATH,
  LOGIN_PATH,
  REFRESH_COOKIE,
} from "@/lib/auth/constants";

/**
 * Optimistic route protection: only checks that session cookies exist.
 * The backend validates every request; the API proxy refreshes tokens.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession =
    req.cookies.has(AUTH_COOKIE) || req.cookies.has(REFRESH_COOKIE);
  const isLoginPage = pathname === LOGIN_PATH;

  if (isLoginPage && hasSession) {
    return NextResponse.redirect(new URL(HOME_PATH, req.url));
  }

  if (!isLoginPage && !hasSession) {
    const login = new URL(LOGIN_PATH, req.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
