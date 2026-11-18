import { api } from "@/lib/api/client";
import type { Paginated, QueryParams } from "@/lib/api/types";
import type { DoctorProfile, Id, User } from "@/lib/models";

export type UserInput = {
  name: string;
  email: string | null;
  phone: string | null;
  password?: string;
  role: Id;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  doctorProfile?: DoctorProfile | null;
  hospitals?: {
    hospital: Id;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    summary: string | null;
  }[];
  isActive: boolean;
};

export const usersApi = {
  list: (params: QueryParams) => api.get<Paginated<User>>("/users", params),
  get: (id: Id) => api.get<User>(`/users/${id}`),
  create: (input: UserInput) => api.post<User>("/users", input),
  update: (id: Id, input: Partial<UserInput>) => api.patch<User>(`/users/${id}`, input),
  remove: (id: Id) => api.delete<User>(`/users/${id}`),
};
