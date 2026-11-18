// Mirrors backend/src/shared/constants.
export const USER_TYPES = ["ADMIN", "DOCTOR", "PATIENT"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const CONDITIONS = [
  "STABLE",
  "UNDER_TREATMENT",
  "CRITICAL",
  "RECOVERED",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const FORM_GROUPS = [
  "TABLET",
  "CAPSULE",
  "LIQUID",
  "INJECTION",
  "TOPICAL",
  "DROPS",
  "INHALATION",
  "OTHER",
] as const;

export const MEDICINE_TYPES = ["ALLOPATHIC", "HERBAL"] as const;

export const MEAL_TIMINGS = ["BEFORE_MEAL", "AFTER_MEAL", "WITH_MEAL", "ANY"] as const;
export type MealTiming = (typeof MEAL_TIMINGS)[number];

export const MEAL_TIMING_LABELS: Record<MealTiming, string> = {
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  WITH_MEAL: "With meal",
  ANY: "Any time",
};

/** Badge colors for conditions, reused by tables, history and prescriptions. */
export const CONDITION_STYLES: Record<Condition, string> = {
  STABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  UNDER_TREATMENT: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  CRITICAL: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  RECOVERED: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
};
