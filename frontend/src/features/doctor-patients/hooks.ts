"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import type { NewPatientInput } from "../patients/api";
import { doctorPatientsApi, type DoctorRef } from "./api";

export const doctorPatientKeys = {
  all: ["doctor-patients"] as const,
  list: (doctorId: DoctorRef, params: QueryParams) =>
    [...doctorPatientKeys.all, doctorId, "list", params] as const,
  consultations: (doctorId: DoctorRef, patientId: Id, params: QueryParams) =>
    [...doctorPatientKeys.all, doctorId, "consultations", patientId, params] as const,
};

export const useDoctorPatients = (doctorId: DoctorRef | null, params: QueryParams) =>
  useQuery({
    queryKey: doctorPatientKeys.list(doctorId ?? "", params),
    queryFn: () => doctorPatientsApi.list(doctorId!, params),
    enabled: Boolean(doctorId),
    placeholderData: keepPreviousData,
  });

export const useDoctorPatientConsultations = (
  doctorId: DoctorRef,
  patientId: Id | null,
  params: QueryParams,
) =>
  useQuery({
    queryKey: doctorPatientKeys.consultations(doctorId, patientId ?? "", params),
    queryFn: () => doctorPatientsApi.consultations(doctorId, patientId!, params),
    enabled: Boolean(patientId),
  });

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: doctorPatientKeys.all });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };
};

export const useAddDoctorPatient = (doctorId: DoctorRef) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { patientId: Id } | { patient: NewPatientInput }) =>
      doctorPatientsApi.add(doctorId, input),
    onSuccess: invalidate,
  });
};

export const useRemoveDoctorPatient = (doctorId: DoctorRef) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (patientId: Id) => doctorPatientsApi.remove(doctorId, patientId),
    onSuccess: invalidate,
  });
};
