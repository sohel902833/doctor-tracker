"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Condition } from "@/lib/constants";

export type Interval = "day" | "week" | "month";

export type Dashboard = {
  range: { from: string; to: string; interval: Interval; timezone: string };
  scope: "clinic" | "doctor";
  totals: { doctors: number | null; patients: number; consultations: number; medicines: number | null };
  period: { consultations: number; firstVisits: number; followUps: number; patientsSeen: number; newPatients: number };
  trend: { period: string; consultations: number; firstVisits: number; followUps: number; newPatients: number }[];
  conditions: { condition: Condition; count: number }[];
  currentConditions: { condition: Condition | null; count: number }[];
  topMedicines: { name: string; count: number }[];
  patientsPerDoctor: { doctorId: string; name: string; specialization: string | null; patients: number; consultations: number }[] | null;
};

export const RANGE_PRESETS = {
  "7d": { label: "7 days", days: 7, interval: "day" },
  "30d": { label: "30 days", days: 30, interval: "day" },
  "90d": { label: "90 days", days: 90, interval: "week" },
  "12m": { label: "12 months", days: 365, interval: "month" },
} as const satisfies Record<string, { label: string; days: number; interval: Interval }>;

export type RangePreset = keyof typeof RANGE_PRESETS;

/**
 * Whole local days, so the request (and the server's cache key) stays the
 * same all day: from = start of the first day, to = end of today.
 */
const toRangeParams = (preset: RangePreset) => {
  const { days, interval } = RANGE_PRESETS[preset];
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    interval,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

export const useDashboard = (preset: RangePreset) => {
  const params = toRangeParams(preset);
  return useQuery({
    queryKey: ["dashboard", preset, params.from],
    queryFn: () => api.get<Dashboard>("/dashboard", params),
    placeholderData: keepPreviousData,
    staleTime: 60_000, // matches the server cache
  });
};

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "2026-11-18" -> "18 Nov", "2026-11" -> "Nov 26" (labels are already in the viewer's timezone). */
export const formatPeriod = (period: string, interval: Interval) =>
  interval === "month"
    ? monthFormat.format(new Date(`${period}-01T00:00:00`))
    : dayFormat.format(new Date(`${period}T00:00:00`));
