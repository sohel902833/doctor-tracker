"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import { hospitalsApi, type HospitalInput } from "./api";

export const hospitalKeys = {
  all: ["hospitals"] as const,
  list: (params: QueryParams) => [...hospitalKeys.all, "list", params] as const,
};

export const useHospitals = (params: QueryParams) =>
  useQuery({
    queryKey: hospitalKeys.list(params),
    queryFn: () => hospitalsApi.list(params),
    placeholderData: keepPreviousData,
  });

/** All hospitals (first 100) for select inputs. */
export const useHospitalOptions = () => {
  const query = useHospitals({ limit: 100 });
  return (query.data?.items ?? []).map((h) => ({ value: h._id, label: h.name }));
};

export const useSaveHospital = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: HospitalInput }) =>
      id ? hospitalsApi.update(id, input) : hospitalsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalKeys.all }),
  });
};

export const useDeleteHospital = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hospitalsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalKeys.all }),
  });
};
