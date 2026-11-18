"use client";

import type { ReactNode } from "react";
import { useCan } from "@/features/auth/session-provider";
import type { PermissionRule } from "@/lib/permissions";

/** Renders children only with the permission: <PermissionGate permission="patient.create"> */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionRule;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
