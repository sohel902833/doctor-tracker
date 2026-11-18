import type { RequestHandler } from "express";
import {
  hasPermission,
  type PermissionKey,
} from "../permissions/permission.utils";
import { forbidden } from "../utils/response";
import { authenticate } from "./authenticate";
import { rateLimit, type RateLimitOptions } from "./rateLimit";

type PermissionOption =
  | PermissionKey
  | PermissionKey[]
  | {
      name: PermissionKey | PermissionKey[];
      match?: "any" | "all";
    };

export type GuardOptions = {
  permission?: PermissionOption;
  rateLimit?: RateLimitOptions;
};

const toPermissionRule = (permission: PermissionOption) =>
  typeof permission === "string" || Array.isArray(permission)
    ? { name: permission, match: undefined }
    : permission;

const ensureAuthenticated: RequestHandler = (req, res, next) =>
  req.user ? next() : authenticate(req, res, next);

const checkPermission =
  (permission: PermissionOption): RequestHandler =>
  (req, res, next) => {
    const { name, match } = toPermissionRule(permission);

    const allowed = hasPermission({
      permissions: req.user?.role.permissions,
      required: name,
      match,
    });
    if (allowed) return next();

    const result = forbidden(
      "You do not have permission to perform this action",
    );
    res.status(result.status).json(result);
  };

/**
 * One middleware for route access. Each step runs only when its option is set:
 *   1. authenticate     (when `permission` is set)
 *   2. rate limit       (when `rateLimit` is set; per user if logged in, else per IP)
 *   3. permission check (when `permission` is set)
 *
 *   guard({ permission: "user.read" })
 *   guard({ permission: { name: ["user.read", "user.update"], match: "all" } })
 *   guard({ rateLimit: { limit: 5, windowSeconds: 60, by: "ip" } })
 */
export const guard = (options: GuardOptions): RequestHandler[] => [
  ...(options.permission ? [ensureAuthenticated] : []),
  ...(options.rateLimit ? [rateLimit(options.rateLimit)] : []),
  ...(options.permission ? [checkPermission(options.permission)] : []),
];
