"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Id } from "@/lib/models";
import { rolesApi, type RoleInput } from "./api";

export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  catalog: () => [...roleKeys.all, "catalog"] as const,
};

export const useRoles = () =>
  useQuery({ queryKey: roleKeys.list(), queryFn: rolesApi.list });

// The catalog only changes with a backend deploy.
export const usePermissionCatalog = () =>
  useQuery({ queryKey: roleKeys.catalog(), queryFn: rolesApi.catalog, staleTime: Infinity });

export const useSaveRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: RoleInput }) =>
      id ? rolesApi.update(id, input) : rolesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      // The current user's own role may have changed.
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
};
