import { z } from "zod";
import { DOCTOR_PATIENT_STATUSES } from "../../shared/constants/medical";
import {
  dateSchema,
  enumSchema,
  objectIdSchema,
  paginationQuerySchema,
} from "../../shared/validation/common";
import { listConsultationsQuerySchema } from "../consultation/consultation.validation";
import {
  conditionSchema,
  newPatientSchema,
} from "../patient/patient.validation";

/** ":doctorId" may be "me" for the logged-in doctor. */
export const doctorParamSchema = z.object({
  doctorId: z.union([z.literal("me"), objectIdSchema("Doctor")], {
    error: "Doctor id must be a valid id or \"me\"",
  }),
});

export const doctorPatientParamSchema = doctorParamSchema.extend({
  patientId: objectIdSchema("Patient"),
});

export const listDoctorPatientsQuerySchema = paginationQuerySchema.extend({
  /** Patient name or phone. */
  search: z.string().trim().optional(),
  condition: conditionSchema.optional(),
  status: enumSchema(DOCTOR_PATIENT_STATUSES, "Status").default("ACTIVE"),
  lastVisitFrom: dateSchema.optional(),
  lastVisitTo: dateSchema.optional(),
});

/** Either link an existing patient or create a new one. */
export const addDoctorPatientSchema = z
  .object({
    patientId: objectIdSchema("Patient").optional(),
    patient: newPatientSchema.optional(),
  })
  .refine((input) => Boolean(input.patientId) !== Boolean(input.patient), {
    error: "Send either patientId or patient, not both",
    path: ["patientId"],
  });

export const doctorPatientConsultationsQuerySchema =
  listConsultationsQuerySchema.omit({ doctor: true, patient: true });

export type ListDoctorPatientsQuery = z.infer<
  typeof listDoctorPatientsQuerySchema
>;
export type AddDoctorPatientInput = z.infer<typeof addDoctorPatientSchema>;
export type DoctorPatientConsultationsQuery = z.infer<
  typeof doctorPatientConsultationsQuerySchema
>;
