import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { Generic, Id, Medicine } from "@/lib/models";

export type MedicineInput = {
  name: string;
  genericId: Id | null;
  dosageForm: string;
  strength: string | null;
  manufacturer: string | null;
  type: "ALLOPATHIC" | "HERBAL";
  priceBdt: number | null;
  packageInfo: string | null;
  isActive: boolean;
};

export type GenericInput = {
  name: string;
  drugClass: string | null;
  indication: string | null;
};

export const medicinesApi = {
  list: (params: QueryParams) => api.get<Paginated<Medicine>>("/medicines", params),
  manufacturers: () => api.get<string[]>("/medicines/manufacturers"),
  create: (input: MedicineInput) => api.post<Medicine>("/medicines", input),
  update: (id: Id, input: MedicineInput) => api.patch<Medicine>(`/medicines/${id}`, input),
  remove: (id: Id) => api.delete<Medicine>(`/medicines/${id}`),
};

export const genericsApi = {
  list: (params: QueryParams) => api.get<Paginated<Generic>>("/medicines/generics", params),
  create: (input: GenericInput) => api.post<Generic>("/medicines/generics", input),
  update: (id: Id, input: GenericInput) => api.patch<Generic>(`/medicines/generics/${id}`, input),
  remove: (id: Id) => api.delete<Generic>(`/medicines/generics/${id}`),
};

/** For pickers: first matches only. */
export const searchMedicines = async (search: string) =>
  (await medicinesApi.list({ search, limit: 15, isActive: true })).items;

export const searchGenerics = async (search: string) =>
  (await genericsApi.list({ search, limit: 15 })).items;
