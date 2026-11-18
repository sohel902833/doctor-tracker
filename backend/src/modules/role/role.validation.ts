import { z } from "zod";
import { USER_TYPES } from "../../shared/constants/userTypes";
import {
  idParamSchema,
  objectIdSchema,
  requiredString,
} from "../../shared/validation/common";

// { GLOBAL: { hasAllPermission: true } } or { role: { read: true }, ... }
const permissionsSchema = z.record(
  z.string(),
  z.record(z.string(), z.boolean({ error: "Must be true or false" }), {
    error: "Must be an object",
  }),
  { error: "Permissions must be an object" },
);

export const createRoleSchema = z.object({
  name: requiredString("Name"),
  userType: z.enum(USER_TYPES, {
    error: `User type must be one of: ${USER_TYPES.join(", ")}`,
  }),
  permissions: permissionsSchema.optional(),
  subordinateRoles: z
    .array(objectIdSchema("Subordinate role"), {
      error: "Subordinate roles must be an array of role ids",
    })
    .transform((ids) => [...new Set(ids)])
    .optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const roleIdParamSchema = idParamSchema("role");

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
