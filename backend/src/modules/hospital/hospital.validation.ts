import { z } from "zod";
import {
  idParamSchema,
  nullableString,
  paginationQuerySchema,
  requiredString,
} from "../../shared/validation/common";

export const createHospitalSchema = z.object({
  name: requiredString("Name"),
  address: nullableString(),
  phone: nullableString(),
  email: z.email("Email must be valid").nullable().optional(),
});

export const updateHospitalSchema = createHospitalSchema.partial();

export const listHospitalsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
});

export const hospitalIdParamSchema = idParamSchema("hospital");

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;
export type ListHospitalsQuery = z.infer<typeof listHospitalsQuerySchema>;
