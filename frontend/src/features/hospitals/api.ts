import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { Hospital, Id } from "@/lib/models";

export type HospitalInput = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export const hospitalsApi = {
  list: (params: QueryParams) => api.get<Paginated<Hospital>>("/hospitals", params),
  create: (input: HospitalInput) => api.post<Hospital>("/hospitals", input),
  update: (id: Id, input: HospitalInput) => api.patch<Hospital>(`/hospitals/${id}`, input),
  remove: (id: Id) => api.delete<Hospital>(`/hospitals/${id}`),
};
