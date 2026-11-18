import {
  appPermissions,
  type AppPermissions,
  type PermissionModule,
} from "./appPermissions";

export const GLOBAL_KEY = "GLOBAL";

export type PermissionAction<M extends PermissionModule> = Extract<
  AppPermissions[M][keyof AppPermissions[M]],
  string
>;

export type RolePermissions = {
  GLOBAL?: { hasAllPermission: boolean };
} & {
  [M in PermissionModule]?: Partial<Record<PermissionAction<M>, boolean>>;
};

export type PermissionKey = {
  [M in PermissionModule]: `${M}.${PermissionAction<M>}`;
}[PermissionModule];

// ---------- Checks ----------
export const isSuperAdmin = (permissions?: RolePermissions | null) =>
  permissions?.GLOBAL?.hasAllPermission === true;

type HasPermissionOptions = {
  permissions: RolePermissions | null | undefined;
  required: PermissionKey | PermissionKey[];
  match?: "any" | "all";
};

const isGranted = (permissions: RolePermissions, key: PermissionKey) => {
  const [moduleName, action] = key.split(".");
  const modulePermissions = permissions[moduleName as PermissionModule] as
    | Record<string, boolean>
    | undefined;

  return modulePermissions?.[action] === true;
};

/**
 *   hasPermission({ permissions, required: "role.create" })
 *   hasPermission({ permissions, required: ["role.read", "doctor.read"], match: "any" })
 */
export const hasPermission = ({
  permissions,
  required,
  match = "any",
}: HasPermissionOptions) => {
  if (!permissions) return false;
  if (isSuperAdmin(permissions)) return true;

  const requiredKeys = Array.isArray(required) ? required : [required];
  if (!requiredKeys.length) return true;

  const check = (key: PermissionKey) => isGranted(permissions, key);
  return match === "any" ? requiredKeys.some(check) : requiredKeys.every(check);
};

export const normalizePermissions = (
  permissions: Record<string, Record<string, boolean>> = {},
): RolePermissions => {
  if (permissions[GLOBAL_KEY]?.hasAllPermission) {
    return { [GLOBAL_KEY]: { hasAllPermission: true } };
  }

  const normalized: Record<string, Record<string, true>> = {};

  for (const [module, actions] of Object.entries(permissions)) {
    if (module === GLOBAL_KEY || !actions) continue;

    const granted = Object.entries(actions).filter(([, value]) => value);
    if (!granted.length) continue;

    normalized[module] = Object.fromEntries(
      granted.map(([action]) => [action, true]),
    );
  }

  return normalized as RolePermissions;
};

// ---------- Catalog for the frontend ----------

const toLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const permissionCatalog = Object.entries(appPermissions).map(
  ([moduleName, actions]) => ({
    module: moduleName,
    label: toLabel(moduleName),
    permissions: Object.values(actions as Record<string, string>).map(
      (action) => ({ key: action, label: toLabel(action) }),
    ),
  }),
);
