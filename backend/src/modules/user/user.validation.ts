import { z } from "zod";
import { USER_TYPES } from "../../shared/constants/userTypes";
import {
  booleanQuerySchema,
  dateSchema,
  emailSchema,
  idParamSchema,
  nullableString,
  objectIdSchema,
  paginationQuerySchema,
  passwordSchema,
  requiredString,
  sortOrderSchema,
} from "../../shared/validation/common";

const userHospitalSchema = z
  .object({
    hospital: objectIdSchema("Hospital"),
    startDate: dateSchema.nullable().optional(),
    endDate: dateSchema.nullable().optional(),
    isCurrent: z.boolean({ error: "Must be true or false" }).default(false),
    summary: nullableString(),
  })
  .refine((entry) => !(entry.isCurrent && entry.endDate), {
    error: "A current hospital cannot have an end date",
    path: ["endDate"],
  })
  .refine(
    (entry) =>
      !entry.startDate || !entry.endDate || entry.endDate >= entry.startDate,
    { error: "End date must be after start date", path: ["endDate"] },
  );

export const createUserSchema = z.object({
  name: requiredString("Name"),
  email: emailSchema,
  phone: nullableString(),
  password: passwordSchema,
  role: objectIdSchema("Role"),
  specialization: nullableString(),
  hospitals: z.array(userHospitalSchema).optional(),
  isActive: z.boolean({ error: "Must be true or false" }).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  userType: z
    .enum(USER_TYPES, {
      error: `User type must be one of: ${USER_TYPES.join(", ")}`,
    })
    .optional(),
  role: objectIdSchema("Role").optional(),
  hospital: objectIdSchema("Hospital").optional(),
  specialization: z.string().trim().optional(),
  isActive: booleanQuerySchema.optional(),
  createdFrom: dateSchema.optional(),
  createdTo: dateSchema.optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  sortOrder: sortOrderSchema,
});

export const userIdParamSchema = idParamSchema("user");

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
