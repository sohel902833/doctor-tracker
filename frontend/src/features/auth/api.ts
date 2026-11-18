import { appRequest } from "@/lib/api/client";
import type { SessionUser } from "@/lib/models";

export type LoginInput = { email: string; password: string };

// These go to our own Next.js route handlers, which manage the cookies.
export const authApi = {
  login: (input: LoginInput) =>
    appRequest<{ user: SessionUser }>("POST", "/api/auth/login", input),
  logout: () => appRequest<null>("POST", "/api/auth/logout", {}),
  session: () => appRequest<SessionUser>("GET", "/api/auth/session"),
};
