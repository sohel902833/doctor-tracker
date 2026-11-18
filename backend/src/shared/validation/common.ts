import { z } from "zod";

const OBJECT_ID = /^[a-f\d]{24}$/i;

export const requiredString = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

// bcrypt only uses the first 72 bytes, and capping length stops attackers
// from sending huge passwords to burn CPU on hashing.
export const PASSWORD_MAX_LENGTH = 72;
const EMAIL_MAX_LENGTH = 254;

/** For setting a password (create user, register). */
export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(PASSWORD_MAX_LENGTH, `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`);

export const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .max(EMAIL_MAX_LENGTH, `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`)
  .toLowerCase()
  .pipe(z.email("Email must be valid"));

/** Optional text that may also be cleared with null. */
export const nullableString = () => z.string().trim().nullable().optional();

export const objectIdSchema = (entity: string) =>
  z
    .string({ error: `${entity} is required` })
    .regex(OBJECT_ID, `Invalid ${entity.toLowerCase()} id`);

/** Validates req.params.id as a Mongo ObjectId. */
export const idParamSchema = (entity: string) =>
  z.object({
    id: z.string().regex(OBJECT_ID, `Invalid ${entity} id`),
  });

export const dateSchema = z.coerce.date({ error: "Must be a valid date" });

/** ?page=1&limit=10 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ error: "Page must be a number" })
    .int()
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

/** Query strings arrive as text, so "true"/"false" become booleans here. */
export const booleanQuerySchema = z
  .enum(["true", "false"], { error: "Must be true or false" })
  .transform((value) => value === "true");
