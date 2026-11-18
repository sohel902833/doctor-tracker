/**
 * Same rules as the backend's permission.utils.ts:
 *   { GLOBAL: { hasAllPermission: true } }  -> super admin, allowed everything
 *   { patient: { read: true } }             -> "patient.read" allowed
 */
export type RolePermissions = Record<string, Record<string, boolean>>;

/** "module.action", e.g. "patient.create". */
export type PermissionKey = `${string}.${string}`;

export type PermissionRule =
  | PermissionKey
  | PermissionKey[]
  | { name: PermissionKey | PermissionKey[]; match?: "any" | "all" };

export const isSuperAdmin = (permissions?: RolePermissions | null) =>
  permissions?.GLOBAL?.hasAllPermission === true;

export const hasPermission = (
  permissions: RolePermissions | null | undefined,
  rule: PermissionRule,
) => {
  if (!permissions) return false;
  if (isSuperAdmin(permissions)) return true;

  const { name, match = "any" } =
    typeof rule === "string" || Array.isArray(rule) ? { name: rule } : rule;
  const keys = Array.isArray(name) ? name : [name];
  if (!keys.length) return true;

  const isGranted = (key: string) => {
    const [moduleName, action] = key.split(".");
    return permissions[moduleName]?.[action] === true;
  };
  return match === "all" ? keys.every(isGranted) : keys.some(isGranted);
};
