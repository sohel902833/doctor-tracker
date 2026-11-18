import type { RequestHandler } from "express";
import { UserModel } from "../../modules/user/user.model";
import type { RolePermissions } from "../permissions/permission.utils";
import { verifyAccessToken } from "../utils/jwt";
import { unauthorized } from "../utils/response";

export type AuthUser = {
  id: string;
  userType: string;
  role: {
    id: string;
    name: string;
    permissions: RolePermissions;
    subordinateRoles: string[];
  };
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type PopulatedRole = {
  _id: { toString(): string };
  name: string;
  permissions: RolePermissions;
  subordinateRoles: { toString(): string }[];
};

/**
 * Requires "Authorization: Bearer <token>".
 * Loads the user and role on every request, so role/permission changes
 * and deactivation take effect immediately.
 */
export const authenticate: RequestHandler = async (req, res, next) => {
  const reject = (message: string) => {
    const result = unauthorized(message);
    res.status(result.status).json(result);
  };

  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) return reject("Authentication required");

  const payload = verifyAccessToken(token);
  if (!payload) return reject("Invalid or expired token");

  const user = await UserModel.findById(payload.sub)
    .select("userType role isActive")
    .populate<{ role: PopulatedRole | null }>(
      "role",
      "name permissions subordinateRoles",
    )
    .lean();

  if (!user || !user.role) return reject("User no longer exists");
  if (!user.isActive) return reject("Account is disabled");

  req.user = {
    id: user._id.toString(),
    userType: user.userType,
    role: {
      id: user.role._id.toString(),
      name: user.role.name,
      permissions: user.role.permissions ?? {},
      subordinateRoles: user.role.subordinateRoles.map(String),
    },
  };

  next();
};
