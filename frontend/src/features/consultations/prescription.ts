import type { Condition, MealTiming } from "@/lib/constants";
import type { Consultation } from "@/lib/models";

/**
 * Everything printed on a prescription. Built from the form while typing
 * (live preview) or from a saved consultation (view / reprint), so the
 * preview, the print-out and the PDF always match.
 */
export type PrescriptionData = {
  prescriptionNo: string | null;
  visitNumber: number | null;
  visitType: "FIRST" | "FOLLOW_UP" | null;
  date: string;
  doctor: {
    name: string;
    specialization: string | null;
    qualifications: string | null;
    registrationNo: string | null;
    designation: string | null;
    hospital: string | null;
  };
  patient: { name: string; age: number | null; gender: string | null; phone: string | null };
  condition: Condition | null;
  diagnosis: string | null;
  notes: string | null;
  medicines: {
    name: string;
    strength: string | null;
    genericName: string | null;
    dosageForm: string | null;
    dose: string;
    schedule: { morning: number; noon: number; night: number };
    mealTiming: MealTiming;
    durationDays: number | null;
    instructions: string | null;
  }[];
  advice: string[];
  followUpDate: string | null;
};

export const fromConsultation = (c: Consultation): PrescriptionData => ({
  prescriptionNo: c.prescriptionNo,
  visitNumber: c.visitNumber,
  visitType: c.visitType,
  date: c.visitedAt,
  doctor: c.doctorSnapshot,
  patient: c.patientSnapshot,
  condition: c.condition,
  diagnosis: c.diagnosis,
  notes: c.notes,
  medicines: c.medicines,
  advice: c.advice,
  followUpDate: c.followUpDate,
});

export const pdfFileName = (data: PrescriptionData) =>
  `${data.prescriptionNo ?? "prescription"}_${data.patient.name.trim().replace(/\s+/g, "-") || "patient"}.pdf`;
