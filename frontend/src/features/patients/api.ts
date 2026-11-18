import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { Condition } from "@/lib/constants";
import type { DoctorPatientRelation, Id, Patient } from "@/lib/models";

export type NewPatientInput = {
  name: string;
  phone: string;
  email?: string | null;
  age?: number;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
};

export type UpdatePatientInput = Partial<NewPatientInput> & {
  condition?: Condition | null;
  isActive?: boolean;
};

export type PatientLookup = {
  patient: Patient | null;
  relation: DoctorPatientRelation | null;
};

export const patientsApi = {
  list: (params: QueryParams) => api.get<Paginated<Patient>>("/patients", params),
  get: (id: Id) => api.get<Patient>(`/patients/${id}`),
  lookup: (phone: string) => api.get<PatientLookup>("/patients/lookup", { phone }),
  create: (input: NewPatientInput) => api.post<Patient>("/patients", input),
  update: (id: Id, input: UpdatePatientInput) => api.patch<Patient>(`/patients/${id}`, input),
  remove: (id: Id) => api.delete<Patient>(`/patients/${id}`),
};
