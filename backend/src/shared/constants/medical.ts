export const CONDITIONS = [
  "STABLE",
  "UNDER_TREATMENT",
  "CRITICAL",
  "RECOVERED",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

/** Broad groups derived from a medicine's exact dosage form, for filters/icons. */
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
export type FormGroup = (typeof FORM_GROUPS)[number];

export const MEDICINE_TYPES = ["ALLOPATHIC", "HERBAL"] as const;

export const MEAL_TIMINGS = [
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "WITH_MEAL",
  "ANY",
] as const;

export const DOCTOR_PATIENT_STATUSES = ["ACTIVE", "REMOVED"] as const;
export type DoctorPatientStatus = (typeof DOCTOR_PATIENT_STATUSES)[number];

export const VISIT_TYPES = ["FIRST", "FOLLOW_UP"] as const;
