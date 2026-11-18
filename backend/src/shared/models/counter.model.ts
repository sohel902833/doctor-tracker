import { model, Schema } from "mongoose";
import { isDuplicateKeyError } from "../utils/mongo";

/** Named sequences, e.g. { _id: "prescription-2026", seq: 123 }. */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const CounterModel = model("Counter", counterSchema);

/** Atomically returns the next number of a sequence (1, 2, 3...). */
export const nextSequence = async (name: string): Promise<number> => {
  const increment = () =>
    CounterModel.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    ).lean();

  try {
    return (await increment())!.seq;
  } catch (error) {
    // Two first-ever calls can race to insert the same _id; the loser retries.
    if (!isDuplicateKeyError(error)) throw error;
    return (await increment())!.seq;
  }
};
