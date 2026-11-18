"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, use, useEffect, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import type { SessionUser } from "@/lib/models";
import { hasPermission, type PermissionRule } from "@/lib/permissions";
import { authApi } from "./api";

export const sessionQueryKey = ["session"] as const;

const SessionContext = createContext<SessionUser | null>(null);

/**
 * Loads the logged-in user once for the whole app. Children render only
 * when the session is known; `fallback` shows meanwhile.
 */
export function SessionProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { data, error } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: authApi.session,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true, // picks up permission changes
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      // A route handler (not a page): it clears the cookies, then redirects.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/api/auth/logout");
    }
  }, [error]);

  if (!data) return fallback;
  return <SessionContext value={data}>{children}</SessionContext>;
}

export const useSession = () => {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
};

/** const canCreate = useCan("patient.create") */
export const useCan = (rule: PermissionRule) =>
  hasPermission(useSession().role.permissions, rule);
