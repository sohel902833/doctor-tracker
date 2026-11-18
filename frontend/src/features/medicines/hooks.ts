"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import { genericsApi, medicinesApi, type GenericInput, type MedicineInput } from "./api";

export const medicineKeys = {
  all: ["medicines"] as const,
  list: (params: QueryParams) => [...medicineKeys.all, "list", params] as const,
  manufacturers: () => [...medicineKeys.all, "manufacturers"] as const,
  generics: (params: QueryParams) => [...medicineKeys.all, "generics", params] as const,
};

export const useMedicines = (params: QueryParams, enabled = true) =>
  useQuery({
    queryKey: medicineKeys.list(params),
    queryFn: () => medicinesApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useManufacturers = () =>
  useQuery({ queryKey: medicineKeys.manufacturers(), queryFn: medicinesApi.manufacturers, staleTime: 10 * 60_000 });

export const useGenerics = (params: QueryParams, enabled = true) =>
  useQuery({
    queryKey: medicineKeys.generics(params),
    queryFn: () => genericsApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });

const useInvalidateCatalog = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: medicineKeys.all });
};

export const useSaveMedicine = () => {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: MedicineInput }) =>
      id ? medicinesApi.update(id, input) : medicinesApi.create(input),
    onSuccess: invalidate,
  });
};

export const useDeleteMedicine = () => {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: medicinesApi.remove, onSuccess: invalidate });
};

export const useSaveGeneric = () => {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: GenericInput }) =>
      id ? genericsApi.update(id, input) : genericsApi.create(input),
    onSuccess: invalidate,
  });
};

export const useDeleteGeneric = () => {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: genericsApi.remove, onSuccess: invalidate });
};
