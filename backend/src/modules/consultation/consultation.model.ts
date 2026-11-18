import { model, Schema, type InferSchemaType } from "mongoose";
import {
  CONDITIONS,
  GENDERS,
  MEAL_TIMINGS,
  VISIT_TYPES,
} from "../../shared/constants/medical";

const prescribedMedicineSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", default: null },
    // Copied at prescribing time, so a reprint never changes.
    name: { type: String, required: true, trim: true },
    strength: { type: String, trim: true, default: null },
    genericName: { type: String, trim: true, default: null },
    dosageForm: { type: String, trim: true, default: null }, // "Tablet (Extended Release)"
    dose: { type: String, required: true, trim: true }, // "1 tab", "10ml"
    schedule: {
      morning: { type: Number, default: 0 },
      noon: { type: Number, default: 0 },
      night: { type: Number, default: 0 },
    },
    mealTiming: { type: String, enum: MEAL_TIMINGS, default: "ANY" },
    durationDays: { type: Number, required: true },
    instructions: { type: String, trim: true, default: null },
  },
  { _id: false },
);

/** One visit of a patient to a doctor. Never deleted: it is the history. */
const consultationSchema = new Schema(
  {
    prescriptionNo: { type: String, required: true }, // "RX-2026-000123"
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    visitNumber: { type: Number, required: true }, // per doctor + patient
    visitType: { type: String, enum: VISIT_TYPES, required: true },
    visitedAt: { type: Date, required: true },
    condition: { type: String, enum: CONDITIONS, required: true },
    diagnosis: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
    medicines: { type: [prescribedMedicineSchema], default: [] },
    advice: { type: [String], default: [] },
    followUpDate: { type: Date, default: null },
    // Snapshots: the prescription prints exactly as issued, even if the
    // doctor's or patient's details change later.
    doctorSnapshot: {
      name: { type: String, required: true },
      specialization: { type: String, default: null },
      qualifications: { type: String, default: null },
      registrationNo: { type: String, default: null },
      designation: { type: String, default: null },
      hospital: { type: String, default: null },
    },
    patientSnapshot: {
      name: { type: String, required: true },
      age: { type: Number, default: null },
      gender: { type: String, enum: [...GENDERS, null], default: null },
      phone: { type: String, default: null },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

consultationSchema.index({ prescriptionNo: 1 }, { unique: true });
consultationSchema.index({ doctor: 1, patient: 1, visitedAt: -1 });
consultationSchema.index({ doctor: 1, visitedAt: -1 });
consultationSchema.index({ patient: 1, visitedAt: -1 });
consultationSchema.index({ visitedAt: 1 });

export type Consultation = InferSchemaType<typeof consultationSchema>;

export const ConsultationModel = model("Consultation", consultationSchema);
