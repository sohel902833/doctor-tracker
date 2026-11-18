import { z } from "zod";
import { MEAL_TIMINGS } from "../../shared/constants/medical";
import {
  dateSchema,
  enumSchema,
  idParamSchema,
  nullableString,
  objectIdSchema,
  paginationQuerySchema,
  requiredString,
} from "../../shared/validation/common";
import {
  conditionSchema,
  newPatientSchema,
} from "../patient/patient.validation";

const doseCountSchema = z
  .number({ error: "Must be a number" })
  .min(0, "Cannot be negative")
  .max(10, "Cannot exceed 10")
  .default(0);

const prescribedMedicineSchema = z.object({
  medicineId: objectIdSchema("Medicine").optional(), // omit for free text
  name: requiredString("Medicine name"),
  strength: nullableString(),
  genericName: nullableString(),
  dosageForm: nullableString(),
  dose: requiredString("Dose"),
  schedule: z.object({
    morning: doseCountSchema,
    noon: doseCountSchema,
    night: doseCountSchema,
  }),
  mealTiming: enumSchema(MEAL_TIMINGS, "Meal timing").default("ANY"),
  durationDays: z
    .number({ error: "Duration is required" })
    .int("Duration must be whole days")
    .min(1, "Duration must be at least 1 day")
    .max(365, "Duration cannot exceed 365 days"),
  instructions: nullableString(),
});

/**
 * Existing patient: `patientId` (+ optional `patient` edits, e.g. age).
 * New patient: `patient` with at least name and phone.
 */
export const createConsultationSchema = z
  .object({
    patientId: objectIdSchema("Patient").optional(),
    patient: newPatientSchema.partial().optional(),
    condition: conditionSchema,
    diagnosis: nullableString(),
    notes: nullableString(),
    medicines: z
      .array(prescribedMedicineSchema)
      .max(50, "Too many medicines")
      .default([]),
    advice: z
      .array(z.string().trim().min(1, "Advice cannot be empty").max(500))
      .max(30, "Too many advice items")
      .default([]),
    followUpDate: dateSchema.nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.patientId) return;

    if (!input.patient) {
      ctx.addIssue({ code: "custom", path: ["patient"], message: "Patient is required" });
      return;
    }
    if (!input.patient.name) {
      ctx.addIssue({ code: "custom", path: ["patient", "name"], message: "Name is required" });
    }
    if (!input.patient.phone) {
      ctx.addIssue({ code: "custom", path: ["patient", "phone"], message: "Phone is required" });
    }
  });

export const listConsultationsQuerySchema = paginationQuerySchema.extend({
  doctor: objectIdSchema("Doctor").optional(),
  patient: objectIdSchema("Patient").optional(),
  condition: conditionSchema.optional(),
  visitedFrom: dateSchema.optional(),
  visitedTo: dateSchema.optional(),
  /** Prescription number or patient name. */
  search: z.string().trim().optional(),
});

export const consultationIdParamSchema = idParamSchema("consultation");

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type ListConsultationsQuery = z.infer<
  typeof listConsultationsQuerySchema
>;
