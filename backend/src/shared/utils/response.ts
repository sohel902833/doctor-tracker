import type { PaginationMeta } from "./pagination";

export type FieldErrors = Record<string, string>;

export interface ServiceResponse<T = unknown> {
  success: boolean;
  status: number;
  message: string;
  data: T | null;
  errors: FieldErrors | null;
}

const ok = <T>(
  status: number,
  message: string,
  data?: T,
): ServiceResponse<T> => ({
  success: true,
  status,
  message,
  data: data ?? null,
  errors: null,
});

const fail = (
  status: number,
  message: string,
  errors?: FieldErrors,
): ServiceResponse<never> => ({
  success: false,
  status,
  message,
  data: null,
  errors: errors ?? null,
});

// ---------- Success ----------
export const success = <T>(message = "Success", data?: T) =>
  ok(200, message, data);
export const created = <T>(message = "Created", data?: T) =>
  ok(201, message, data);
export const paginated = <T>(
  message: string,
  items: T[],
  meta: PaginationMeta,
) => ok(200, message, { items, meta });

// ---------- Client errors ----------
export const badRequest = (message = "Bad request", errors?: FieldErrors) =>
  fail(400, message, errors);
export const validationError = (
  errors: FieldErrors,
  message = "Validation failed",
) => fail(400, message, errors);
export const unauthorized = (message = "Unauthorized") => fail(401, message);
export const forbidden = (message = "Forbidden") => fail(403, message);
export const notFound = (message = "Not found") => fail(404, message);
export const conflict = (message = "Conflict", errors?: FieldErrors) =>
  fail(409, message, errors);

// ---------- Server errors ----------
export const serverError = (
  message = "Internal server error",
  error?: unknown,
) => {
  console.error(`[serverError] ${message}`, error);
  return fail(500, message);
};
