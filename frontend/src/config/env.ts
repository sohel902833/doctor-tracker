import "server-only";
import { z } from "zod";

/** Server-only settings. The browser never talks to the backend directly. */
const envSchema = z.object({
  BACKEND_URL: z.url().default("http://localhost:5000/api/v1"),
  // Lifetime of the refresh cookie; matches the backend's REFRESH_TOKEN_TTL.
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604_800),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Secure (HTTPS-only) session cookies. Defaults to on in production; set
  // "false" when the app is served over plain http (e.g. local Docker).
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  COOKIE_SECURE: parsed.COOKIE_SECURE
    ? parsed.COOKIE_SECURE === "true"
    : parsed.NODE_ENV === "production",
};
