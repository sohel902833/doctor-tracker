import { z } from "zod";
import { dateSchema } from "../../shared/validation/common";

export const INTERVALS = ["day", "week", "month"] as const;
export type Interval = (typeof INTERVALS)[number];

const MAX_RANGE_DAYS = 731;

const isValidTimezone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * ?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z&interval=day&timezone=Asia/Dhaka
 * All optional: defaults to the last 30 days, grouped by day, in UTC.
 */
export const dashboardQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    interval: z.enum(INTERVALS, { error: "Interval must be day, week or month" }).optional(),
    // Days/months are grouped in the viewer's timezone, not the server's.
    timezone: z
      .string()
      .refine(isValidTimezone, "Unknown timezone")
      .default("UTC"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    error: "From must be before to",
    path: ["from"],
  })
  .refine(
    (q) =>
      !q.from ||
      !q.to ||
      (q.to.getTime() - q.from.getTime()) / 86_400_000 <= MAX_RANGE_DAYS,
    { error: "Range cannot exceed 2 years", path: ["to"] },
  );

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
