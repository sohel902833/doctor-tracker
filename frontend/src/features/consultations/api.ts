import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { Condition, MealTiming } from "@/lib/constants";
import type { Consultation, Id } from "@/lib/models";
import type { NewPatientInput } from "../patients/api";

export type PrescribedMedicineInput = {
  medicineId?: Id;
  name: string;
  strength?: string | null;
  genericName?: string | null;
  dosageForm?: string | null;
  dose: string;
  schedule: { morning: number; noon: number; night: number };
  mealTiming: MealTiming;
  durationDays: number;
  instructions?: string | null;
};

export type ConsultationInput = {
  patientId?: Id;
  patient?: Partial<NewPatientInput>;
  condition: Condition;
  diagnosis?: string | null;
  notes?: string | null;
  medicines: PrescribedMedicineInput[];
  advice: string[];
  followUpDate?: string | null;
};

export const consultationsApi = {
  list: (params: QueryParams) => api.get<Paginated<Consultation>>("/consultations", params),
  get: (id: Id) => api.get<Consultation>(`/consultations/${id}`),
  create: (input: ConsultationInput) => api.post<Consultation>("/consultations", input),
};
