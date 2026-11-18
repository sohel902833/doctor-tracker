import { Types } from "mongoose";

/** Aggregation pipelines don't auto-cast ids, so cast them explicitly. */
export const toObjectId = (id: string) => new Types.ObjectId(id);

/** MongoDB rejected a write because a unique index already has that value. */
export const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: number }).code === 11000;
