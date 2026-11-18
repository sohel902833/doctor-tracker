"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import { consultationsApi, type ConsultationInput } from "./api";

export const consultationKeys = {
  all: ["consultations"] as const,
  list: (params: QueryParams) => [...consultationKeys.all, "list", params] as const,
  detail: (id: Id) => [...consultationKeys.all, "detail", id] as const,
};

export const useConsultations = (params: QueryParams, enabled = true) =>
  useQuery({
    queryKey: consultationKeys.list(params),
    queryFn: () => consultationsApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useConsultation = (id: Id) =>
  useQuery({ queryKey: consultationKeys.detail(id), queryFn: () => consultationsApi.get(id) });

export const useCreateConsultation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultationInput) => consultationsApi.create(input),
    onSuccess: (consultation) => {
      queryClient.setQueryData(consultationKeys.detail(consultation._id), consultation);
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
};
