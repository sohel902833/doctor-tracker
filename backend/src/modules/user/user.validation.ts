import { z } from "zod";
import { BLOOD_GROUPS, GENDERS } from "../../shared/constants/medical";
import { USER_TYPES } from "../../shared/constants/userTypes";
import {
  booleanQuerySchema,
  dateSchema,
  emailSchema,
  enumSchema,
  idParamSchema,
  nullableString,
  objectIdSchema,
  paginationQuerySchema,
  passwordSchema,
  phoneSchema,
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

export const doctorProfileSchema = z.object({
  specialization: nullableString(),
  qualifications: nullableString(),
  registrationNo: nullableString(),
  designation: nullableString(),
});

// Which fields are required depends on the role's userType, so that is
// checked in the service: patients need a phone, everyone else an email
// and a password.
export const createUserSchema = z.object({
  name: requiredString("Name"),
  email: emailSchema.nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  password: passwordSchema.optional(),
  role: objectIdSchema("Role"),
  dateOfBirth: dateSchema.nullable().optional(),
  gender: enumSchema(GENDERS, "Gender").nullable().optional(),
  bloodGroup: enumSchema(BLOOD_GROUPS, "Blood group").nullable().optional(),
  doctorProfile: doctorProfileSchema.nullable().optional(),
  hospitals: z.array(userHospitalSchema).optional(),
  isActive: z.boolean({ error: "Must be true or false" }).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  userType: enumSchema(USER_TYPES, "User type").optional(),
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
