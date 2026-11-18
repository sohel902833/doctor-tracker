import { z } from "zod";
import {
  emailSchema,
  PASSWORD_MAX_LENGTH,
  passwordSchema,
  phoneSchema,
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
  // Self sign-up creates a patient, and patients need a phone.
  phone: phoneSchema,
  password: passwordSchema,
});

const refreshTokenSchema = z.uuid("Invalid refresh token");

export const refreshSchema = z.object({
  refreshToken: z
    .string({ error: "Refresh token is required" })
    .pipe(refreshTokenSchema),
});

// Sending the refresh token on logout revokes it too.
export const logoutSchema = z.object({
  refreshToken: refreshTokenSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
