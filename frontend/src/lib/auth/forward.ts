import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { backendFetch, refreshSession } from "./backend";
import { AUTH_COOKIE, REFRESH_COOKIE } from "./constants";
import {
  clearSessionCookies,
  setSessionCookies,
  type SessionTokens,
} from "./cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PASSTHROUGH_HEADERS = [
  "content-type",
  "retry-after",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
];

const failure = (status: number, message: string) =>
  NextResponse.json(
    { success: false, status, message, data: null, errors: null },
    { status },
  );

/** Writes must come from our own pages (on top of SameSite cookies). */
const isSameOrigin = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients don't send Origin
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
};

/**
 * Forwards a request to the Express API with the auth token from the
 * httpOnly cookie. If the token is missing or rejected, it refreshes once
 * with the refresh cookie and retries, updating the cookies.
 */
export const forwardToBackend = async (req: NextRequest, path: string) => {
  if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return failure(403, "Cross-origin request blocked");
  }

  const body = SAFE_METHODS.has(req.method) ? undefined : await req.text();
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let authToken = req.cookies.get(AUTH_COOKIE)?.value;
  let renewed: SessionTokens | null = null;

  if (!authToken && refreshToken) {
    renewed = await refreshSession(refreshToken);
    authToken = renewed?.authToken;
  }
  if (!authToken) {
    const res = failure(401, "Session expired, please log in again");
    clearSessionCookies(res);
    return res;
  }

  const send = (token: string) =>
    backendFetch(path, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && {
          "Content-Type": req.headers.get("content-type") ?? "application/json",
        }),
      },
      body,
    });

  let upstream = await send(authToken);

  // Token expired or revoked mid-session: refresh once and retry.
  if (upstream.status === 401 && refreshToken && !renewed) {
    renewed = await refreshSession(refreshToken);
    if (renewed) upstream = await send(renewed.authToken);
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
  if (renewed) setSessionCookies(res, renewed);
  else if (upstream.status === 401) clearSessionCookies(res);
  return res;
};
