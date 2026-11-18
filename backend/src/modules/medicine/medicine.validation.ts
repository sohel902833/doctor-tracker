import { z } from "zod";
import {
  FORM_GROUPS,
  MEDICINE_TYPES,
} from "../../shared/constants/medical";
import {
  booleanQuerySchema,
  enumSchema,
  idParamSchema,
  nullableString,
  objectIdSchema,
  paginationQuerySchema,
  requiredString,
} from "../../shared/validation/common";

export const createMedicineSchema = z.object({
  name: requiredString("Name"),
  genericId: objectIdSchema("Generic").nullable().optional(),
  dosageForm: requiredString("Dosage form"),
  strength: nullableString(),
  manufacturer: nullableString(),
  type: enumSchema(MEDICINE_TYPES, "Type").optional(),
  priceBdt: z
    .number({ error: "Price must be a number" })
    .min(0, "Price cannot be negative")
    .nullable()
    .optional(),
  packageInfo: nullableString(),
  isActive: z.boolean({ error: "Must be true or false" }).optional(),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export const listMedicinesQuerySchema = paginationQuerySchema.extend({
  /** Matches the start of the brand OR generic name: "aml" finds Amlodipine brands. */
  search: z.string().trim().optional(),
  generic: objectIdSchema("Generic").optional(),
  formGroup: enumSchema(FORM_GROUPS, "Form group").optional(),
  type: enumSchema(MEDICINE_TYPES, "Type").optional(),
  manufacturer: z.string().trim().optional(),
  isActive: booleanQuerySchema.optional(),
});

export const medicineIdParamSchema = idParamSchema("medicine");

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type ListMedicinesQuery = z.infer<typeof listMedicinesQuerySchema>;
