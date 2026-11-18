import { z } from "zod";
import {
  BLOOD_GROUPS,
  CONDITIONS,
  GENDERS,
} from "../../shared/constants/medical";
import {
  ageSchema,
  booleanQuerySchema,
  dateSchema,
  emailSchema,
  enumSchema,
  idParamSchema,
  objectIdSchema,
  paginationQuerySchema,
  phoneSchema,
  requiredString,
  sortOrderSchema,
} from "../../shared/validation/common";

export const conditionSchema = enumSchema(CONDITIONS, "Condition");

/** A new patient. `age` is turned into an estimated date of birth. */
export const newPatientSchema = z.object({
  name: requiredString("Name"),
  phone: phoneSchema,
  email: emailSchema.nullable().optional(),
  age: ageSchema.optional(),
  dateOfBirth: dateSchema.nullable().optional(),
  gender: enumSchema(GENDERS, "Gender").nullable().optional(),
  bloodGroup: enumSchema(BLOOD_GROUPS, "Blood group").nullable().optional(),
});

export const updatePatientSchema = newPatientSchema
  .extend({
    condition: conditionSchema.nullable(),
    isActive: z.boolean({ error: "Must be true or false" }),
  })
  .partial();

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  condition: conditionSchema.optional(),
  gender: enumSchema(GENDERS, "Gender").optional(),
  doctor: objectIdSchema("Doctor").optional(),
  isActive: booleanQuerySchema.optional(),
  createdFrom: dateSchema.optional(),
  createdTo: dateSchema.optional(),
  sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  sortOrder: sortOrderSchema,
});

export const lookupPatientQuerySchema = z.object({ phone: phoneSchema });

export const patientIdParamSchema = idParamSchema("patient");

export type NewPatientInput = z.infer<typeof newPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
