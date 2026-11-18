import { api } from "@/lib/api/client";
import type { UserType } from "@/lib/constants";
import type { Id, PermissionCatalog, Role } from "@/lib/models";
import type { RolePermissions } from "@/lib/permissions";

export type RoleInput = {
  name: string;
  userType: UserType;
  permissions: RolePermissions;
  subordinateRoles: Id[];
};

export const rolesApi = {
  list: () => api.get<Role[]>("/roles"),
  catalog: () => api.get<PermissionCatalog>("/roles/permissions"),
  create: (input: RoleInput) => api.post<Role>("/roles", input),
  update: (id: Id, input: Partial<RoleInput>) => api.patch<Role>(`/roles/${id}`, input),
  remove: (id: Id) => api.delete<Role>(`/roles/${id}`),
};
