import { z } from "zod";
import {
  idParamSchema,
  nullableString,
  paginationQuerySchema,
  requiredString,
} from "../../shared/validation/common";

export const createGenericSchema = z.object({
  name: requiredString("Name"),
  drugClass: nullableString(),
  indication: nullableString(),
});

export const updateGenericSchema = createGenericSchema.partial();

export const listGenericsQuerySchema = paginationQuerySchema.extend({
  /** Matches the start of the name: "amlo" finds "Amlodipine". */
  search: z.string().trim().optional(),
  drugClass: z.string().trim().optional(),
});

export const genericIdParamSchema = idParamSchema("generic");

export type CreateGenericInput = z.infer<typeof createGenericSchema>;
export type UpdateGenericInput = z.infer<typeof updateGenericSchema>;
export type ListGenericsQuery = z.infer<typeof listGenericsQuerySchema>;
