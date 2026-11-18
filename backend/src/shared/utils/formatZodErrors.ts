import type { ZodError } from "zod";
import type { FieldErrors } from "./response";

/**
 * Turns Zod issues into a flat { field: message } map.
 * Nested paths use dots, e.g. { "address.city": "City is required" }.
 * Only the first message per field is kept.
 */
export const formatZodErrors = (error: ZodError): FieldErrors => {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "root";
    if (!(key in errors)) errors[key] = issue.message;
  }

  return errors;
};
