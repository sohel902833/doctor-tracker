import { model, Schema, type InferSchemaType } from "mongoose";
import {
  CONDITIONS,
  DOCTOR_PATIENT_STATUSES,
} from "../../shared/constants/medical";

/**
 * A doctor's patient list: one entry per doctor + patient pair.
 * An admin can add a patient without a visit (stats stay empty);
 * every consultation updates the stats.
 */
const doctorPatientSchema = new Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: DOCTOR_PATIENT_STATUSES, default: "ACTIVE" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    visitCount: { type: Number, default: 0 },
    firstVisitAt: { type: Date, default: null },
    lastVisitAt: { type: Date, default: null },
    lastCondition: { type: String, enum: [...CONDITIONS, null], default: null },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

doctorPatientSchema.index({ doctor: 1, patient: 1 }, { unique: true });
doctorPatientSchema.index({ doctor: 1, status: 1, lastVisitAt: -1 });
doctorPatientSchema.index({ patient: 1, status: 1 });

export type DoctorPatient = InferSchemaType<typeof doctorPatientSchema>;

export const DoctorPatientModel = model("DoctorPatient", doctorPatientSchema);
