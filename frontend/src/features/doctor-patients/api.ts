import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { Consultation, DoctorPatientRelation, Id } from "@/lib/models";
import type { DoctorPatientRow } from "@/lib/models";
import type { NewPatientInput } from "../patients/api";

/** doctorId may be "me" for the logged-in doctor. */
export type DoctorRef = Id | "me";

export const doctorPatientsApi = {
  list: (doctorId: DoctorRef, params: QueryParams) =>
    api.get<Paginated<DoctorPatientRow>>(`/doctors/${doctorId}/patients`, params),
  add: (doctorId: DoctorRef, input: { patientId: Id } | { patient: NewPatientInput }) =>
    api.post<DoctorPatientRelation>(`/doctors/${doctorId}/patients`, input),
  remove: (doctorId: DoctorRef, patientId: Id) =>
    api.delete<DoctorPatientRelation>(`/doctors/${doctorId}/patients/${patientId}`),
  consultations: (doctorId: DoctorRef, patientId: Id, params: QueryParams) =>
    api.get<Paginated<Consultation>>(`/doctors/${doctorId}/patients/${patientId}/consultations`, params),
};
