import "server-only";
import { env } from "@/config/env";
import type { ApiResponse } from "@/lib/api/types";
import type { SessionTokens } from "./cookies";

/** Calls the Express API from route handlers. Never cached. */
export const backendFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${env.BACKEND_URL}${path}`, { ...init, cache: "no-store" });

// ---------- Refresh ----------

type RefreshResult = SessionTokens | null;

/**
 * Refresh tokens are single-use. When several requests notice an expired
 * session at once, they must share ONE refresh call, otherwise the second
 * call would fail and log the user out. Results are kept briefly so
 * requests that arrive slightly later (still carrying the old cookie)
 * reuse the new tokens too.
 */
const recentRefreshes = new Map<string, Promise<RefreshResult>>();
const REUSE_WINDOW_MS = 30_000;

const callRefresh = async (refreshToken: string): Promise<RefreshResult> => {
  try {
    const res = await backendFetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiResponse<SessionTokens>;
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
};

export const refreshSession = (refreshToken: string) => {
  const existing = recentRefreshes.get(refreshToken);
  if (existing) return existing;

  const pending = callRefresh(refreshToken);
  recentRefreshes.set(refreshToken, pending);
  setTimeout(() => recentRefreshes.delete(refreshToken), REUSE_WINDOW_MS);
  return pending;
};
