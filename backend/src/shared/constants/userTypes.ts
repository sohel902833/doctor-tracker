export const USER_TYPES = ["ADMIN", "DOCTOR", "PATIENT"] as const;

export type UserType = (typeof USER_TYPES)[number];
