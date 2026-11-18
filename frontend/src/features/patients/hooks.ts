"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import { patientsApi, type NewPatientInput, type UpdatePatientInput } from "./api";

export const patientKeys = {
  all: ["patients"] as const,
  list: (params: QueryParams) => [...patientKeys.all, "list", params] as const,
  detail: (id: Id) => [...patientKeys.all, "detail", id] as const,
  lookup: (phone: string) => [...patientKeys.all, "lookup", phone] as const,
};

export const usePatients = (params: QueryParams) =>
  useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientsApi.list(params),
    placeholderData: keepPreviousData,
  });

export const usePatient = (id: Id | null | undefined) =>
  useQuery({
    queryKey: patientKeys.detail(id ?? ""),
    queryFn: () => patientsApi.get(id!),
    enabled: Boolean(id),
  });

/** Phone lookup that waits for typing to stop and a plausible length. */
export const usePatientLookup = (phone: string) => {
  const digits = useDebounce(phone.replace(/[\s\-()]/g, ""), 400);
  const enabled = /^\+?\d{6,15}$/.test(digits);
  const query = useQuery({
    queryKey: patientKeys.lookup(digits),
    queryFn: () => patientsApi.lookup(digits),
    enabled,
    staleTime: 10_000,
  });
  return { ...query, enabled, phone: digits };
};

/** Patient changes touch lists everywhere (patients, doctor lists, users). */
const useInvalidatePeople = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: patientKeys.all });
    queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
};

export const useCreatePatient = () => {
  const invalidate = useInvalidatePeople();
  return useMutation({ mutationFn: (input: NewPatientInput) => patientsApi.create(input), onSuccess: invalidate });
};

export const useUpdatePatient = () => {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ id, input }: { id: Id; input: UpdatePatientInput }) => patientsApi.update(id, input),
    onSuccess: invalidate,
  });
};

export const useDeletePatient = () => {
  const invalidate = useInvalidatePeople();
  return useMutation({ mutationFn: patientsApi.remove, onSuccess: invalidate });
};
