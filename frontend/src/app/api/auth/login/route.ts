import { NextResponse, type NextRequest } from "next/server";
import type { ApiResponse } from "@/lib/api/types";
import { backendFetch } from "@/lib/auth/backend";
import { setSessionCookies, type SessionTokens } from "@/lib/auth/cookies";

type LoginData = SessionTokens & { user: unknown };

/** Logs in, stores the tokens in httpOnly cookies, returns only the user. */
export async function POST(req: NextRequest) {
  // Lets the backend rate-limit by the real client IP, not this server's.
  const clientIp =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");

  const upstream = await backendFetch("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientIp && { "X-Forwarded-For": clientIp }),
    },
    body: await req.text(),
  });
  const json = (await upstream.json()) as ApiResponse<LoginData>;

  if (!json.success || !json.data) {
    return NextResponse.json(json, { status: upstream.status });
  }

  const { authToken, refreshToken, expiresIn, user } = json.data;
  const res = NextResponse.json({ ...json, data: { user } });
  setSessionCookies(res, { authToken, refreshToken, expiresIn });
  return res;
}
