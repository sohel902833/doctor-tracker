import { NextResponse, type NextRequest } from "next/server";
import { backendFetch } from "@/lib/auth/backend";
import { AUTH_COOKIE, LOGIN_PATH, REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearSessionCookies } from "@/lib/auth/cookies";

/** Revokes the tokens on the backend (best effort) and clears the cookies. */
const revoke = async (req: NextRequest) => {
  const authToken = req.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!authToken) return;

  await backendFetch("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  }).catch(() => undefined);
};

export async function POST(req: NextRequest) {
  await revoke(req);
  const res = NextResponse.json({
    success: true,
    status: 200,
    message: "Logged out",
    data: null,
    errors: null,
  });
  clearSessionCookies(res);
  return res;
}

/** Link-style logout (e.g. a broken session): clears cookies, goes to login. */
export async function GET(req: NextRequest) {
  await revoke(req);
  const res = NextResponse.redirect(new URL(LOGIN_PATH, req.url));
  clearSessionCookies(res);
  return res;
}
