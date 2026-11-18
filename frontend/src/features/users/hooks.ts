"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryParams } from "@/lib/api/types";
import type { Id } from "@/lib/models";
import { usersApi, type UserInput } from "./api";

export const userKeys = {
  all: ["users"] as const,
  list: (params: QueryParams) => [...userKeys.all, "list", params] as const,
};

export const useUsers = (params: QueryParams, enabled = true) =>
  useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Doctors (first 100) for select inputs. */
export const useDoctorOptions = (enabled = true) => {
  const query = useUsers({ userType: "DOCTOR", limit: 100, sortBy: "name", sortOrder: "asc" }, enabled);
  return (query.data?.items ?? []).map((d) => ({ value: d._id, label: d.name }));
};

export const useSaveUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: UserInput }) =>
      id ? usersApi.update(id, input) : usersApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
};
