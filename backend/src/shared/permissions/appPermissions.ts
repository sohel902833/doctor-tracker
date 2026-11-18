export const Modules = {
  ROLE: "role",
  USER: "user",
  HOSPITAL: "hospital",
} as const;

export type ModuleName = (typeof Modules)[keyof typeof Modules];
export const getDefaultPermissions = () =>
  ({
    create: "create",
    read: "read",
    update: "update",
    delete: "delete",
  }) as const;

const defaultModulePermissions = Object.fromEntries(
  Object.values(Modules).map((moduleName) => [
    moduleName,
    getDefaultPermissions(),
  ]),
) as { [M in ModuleName]: ReturnType<typeof getDefaultPermissions> };

export const appPermissions = {
  ...defaultModulePermissions,

  // Overrides go below. A key here replaces that module's defaults.
  // [Modules.DOCTOR]: {
  //   ...getDefaultPermissions(),
  //   approve: "approve",
  // },
  //
  // Or define only custom actions:
  // [Modules.DASHBOARD]: {
  //   appointment_section: "appointment_section",
  //   revenue_section: "revenue_section",
  // },
} as const;

export type AppPermissions = typeof appPermissions;
export type PermissionModule = keyof AppPermissions;
