import { z } from "zod";
import {
  emailSchema,
  nullableString,
  PASSWORD_MAX_LENGTH,
  passwordSchema,
  requiredString,
} from "../../shared/validation/common";

export const loginSchema = z.object({
  email: emailSchema,
  // Not trimmed: spaces can be part of a password.
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(
      PASSWORD_MAX_LENGTH,
      `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
    ),
});

export const registerSchema = z.object({
  name: requiredString("Name"),
  email: emailSchema,
  phone: nullableString(),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
