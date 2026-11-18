import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Loads configs/.env.<NODE_ENV> (defaults to development).
const nodeEnv = process.env.NODE_ENV ?? "development";
dotenv.config({
  path: path.resolve(__dirname, `../../configs/.env.${nodeEnv}`),
  quiet: true,
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
};
