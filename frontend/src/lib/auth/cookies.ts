import "server-only";
import type { NextResponse } from "next/server";
import { env } from "@/config/env";
import { AUTH_COOKIE, REFRESH_COOKIE } from "./constants";

export type SessionTokens = {
  authToken: string;
  refreshToken: string;
  /** Seconds until the auth token expires. */
  expiresIn: number;
};

// httpOnly: page scripts can't read the tokens (XSS can't steal them).
// sameSite lax: not sent on cross-site POSTs (CSRF).
const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
};

/**
 * The auth cookie lives exactly as long as the auth token, so an expired
 * token simply means "no auth cookie" and the next API call refreshes.
 */
export const setSessionCookies = (res: NextResponse, tokens: SessionTokens) => {
  res.cookies.set(AUTH_COOKIE, tokens.authToken, {
    ...baseOptions,
    maxAge: tokens.expiresIn,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL,
  });
};

export const clearSessionCookies = (res: NextResponse) => {
  res.cookies.set(AUTH_COOKIE, "", { ...baseOptions, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...baseOptions, maxAge: 0 });
};
