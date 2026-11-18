import { model, Schema, type InferSchemaType } from "mongoose";
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

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: null },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    // Copied from the role so lists can filter by type without a lookup.
    userType: { type: String, enum: USER_TYPES, required: true },
    specialization: { type: String, trim: true, default: null },
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

userSchema.index({ email: 1 }, { unique: true });
// Unique only when a phone is set, so many users can have no phone.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);
userSchema.index({ userType: 1, createdAt: -1 });
userSchema.index({ role: 1 });
userSchema.index({ "hospitals.hospital": 1 });

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);
