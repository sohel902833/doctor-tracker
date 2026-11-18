import { model, Schema, type InferSchemaType } from "mongoose";
import {
  BLOOD_GROUPS,
  CONDITIONS,
  GENDERS,
} from "../../shared/constants/medical";
import { USER_TYPES } from "../../shared/constants/userTypes";

const userHospitalSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isCurrent: { type: Boolean, default: false },
    summary: { type: String, trim: true, default: null },
  },
  { _id: false },
);

// Printed on prescriptions.
const doctorProfileSchema = new Schema(
  {
    specialization: { type: String, trim: true, default: null },
    qualifications: { type: String, trim: true, default: null }, // "MBBS, FCPS"
    registrationNo: { type: String, trim: true, default: null }, // e.g. BMDC no.
    designation: { type: String, trim: true, default: null }, // "Consultant"
  },
  { _id: false },
);

const patientProfileSchema = new Schema(
  {
    // Copied from the latest consultation, so the patients page can filter on it.
    currentCondition: { type: String, enum: [...CONDITIONS, null], default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Patients may have no email and no password (they never log in).
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    password: { type: String, default: null, select: false },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    // Copied from the role so lists can filter by type without a lookup.
    userType: { type: String, enum: USER_TYPES, required: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: [...GENDERS, null], default: null },
    bloodGroup: { type: String, enum: [...BLOOD_GROUPS, null], default: null },
    doctorProfile: { type: doctorProfileSchema, default: null },
    patientProfile: { type: patientProfileSchema, default: null },
    hospitals: { type: [userHospitalSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, user) => {
        delete (user as { password?: string }).password;
        return user;
      },
    },
  },
);

// Unique only when set, so many users can have no email / no phone.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);
userSchema.index({ userType: 1, createdAt: -1 });
userSchema.index({ userType: 1, "patientProfile.currentCondition": 1, createdAt: -1 });
userSchema.index({ role: 1 });
userSchema.index({ "hospitals.hospital": 1 });

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);
