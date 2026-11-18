import { model, Schema, type InferSchemaType } from "mongoose";
import {
  FORM_GROUPS,
  MEDICINE_TYPES,
} from "../../shared/constants/medical";

/** A branded medicine, e.g. "Amlocard 5 mg Tablet" (generic: Amlodipine). */
const medicineSchema = new Schema(
  {
    // brandId from the imported catalog; null when added by an admin.
    sourceId: { type: Number, default: null },
    name: { type: String, required: true, trim: true }, // brand name
    normalizedName: { type: String, required: true },
    generic: { type: Schema.Types.ObjectId, ref: "Generic", default: null },
    // Copied from the generic so lists and search need no lookup.
    genericName: { type: String, trim: true, default: null },
    normalizedGenericName: { type: String, default: null },
    dosageForm: { type: String, required: true, trim: true }, // "Tablet (Extended Release)"
    formGroup: { type: String, enum: FORM_GROUPS, required: true }, // derived: "TABLET"
    strength: { type: String, trim: true, default: null }, // "5 mg"
    manufacturer: { type: String, trim: true, default: null },
    type: { type: String, enum: MEDICINE_TYPES, default: "ALLOPATHIC" },
    priceBdt: { type: Number, default: null },
    packageInfo: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

medicineSchema.index(
  { sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: "number" } } },
);
// "Starts with" search on brand or generic name, each using its own index.
medicineSchema.index({ normalizedName: 1, strength: 1 });
medicineSchema.index({ normalizedGenericName: 1 });
medicineSchema.index({ generic: 1 });
medicineSchema.index({ manufacturer: 1 });
medicineSchema.index({ formGroup: 1 });

export type Medicine = InferSchemaType<typeof medicineSchema>;

export const MedicineModel = model("Medicine", medicineSchema);
