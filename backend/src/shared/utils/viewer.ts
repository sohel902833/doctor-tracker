import type { SessionProfile } from "../../modules/auth/session";

/**
 * Doctors only ever see their own patients and consultations, whatever
 * their role allows. Returns the doctor's id when the viewer is a doctor.
 */
export const doctorScopeOf = (viewer?: SessionProfile | null) =>
  viewer?.userType === "DOCTOR" ? viewer._id : null;
