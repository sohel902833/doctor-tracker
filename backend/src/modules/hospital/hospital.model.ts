import { model, Schema, type InferSchemaType } from "mongoose";
import { caseInsensitive } from "../../shared/utils/collation";

const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
  },
  { timestamps: true, versionKey: false },
);

hospitalSchema.index({ name: 1 }, { unique: true, collation: caseInsensitive });
hospitalSchema.index({ createdAt: -1 });

export type Hospital = InferSchemaType<typeof hospitalSchema>;

export const HospitalModel = model("Hospital", hospitalSchema);
