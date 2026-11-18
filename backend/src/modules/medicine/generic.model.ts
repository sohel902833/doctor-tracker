import { model, Schema, type InferSchemaType } from "mongoose";

/** A generic (active ingredient), e.g. "Amlodipine". Brands point to it. */
const genericSchema = new Schema(
  {
    // genericId from the imported catalog; null when added by an admin.
    sourceId: { type: Number, default: null },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true },
    drugClass: { type: String, trim: true, default: null },
    indication: { type: String, trim: true, default: null },
  },
  { timestamps: true, versionKey: false },
);

genericSchema.index(
  { sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: "number" } } },
);
genericSchema.index({ normalizedName: 1 }, { unique: true });

export type Generic = InferSchemaType<typeof genericSchema>;

export const GenericModel = model("Generic", genericSchema);
