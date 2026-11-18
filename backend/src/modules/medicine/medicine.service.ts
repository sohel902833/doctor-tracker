import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import { escapeRegex } from "../../shared/utils/query";
import {
  badRequest,
  created,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { GenericModel } from "./generic.model";
import { MedicineModel } from "./medicine.model";
import { normalizeSearchText, toFormGroup } from "./medicine.utils";
import type {
  CreateMedicineInput,
  ListMedicinesQuery,
  UpdateMedicineInput,
} from "./medicine.validation";

const HIDDEN_FIELDS = "-normalizedName -normalizedGenericName";

/** genericId -> the generic fields stored on a medicine (null clears them). */
const resolveGenericFields = async (genericId: string | null) => {
  if (!genericId) {
    return { fields: { generic: null, genericName: null, normalizedGenericName: null } };
  }

  const generic = await GenericModel.findById(genericId).select("name").lean();
  if (!generic) return { error: badRequest("Invalid generic", { genericId: "Generic not found" }) };

  return {
    fields: {
      generic: generic._id,
      genericName: generic.name,
      normalizedGenericName: normalizeSearchText(generic.name),
    },
  };
};

// ---------- Services ----------

export const createMedicine = async ({
  genericId,
  ...input
}: CreateMedicineInput) => {
  try {
    const { fields, error } = await resolveGenericFields(genericId ?? null);
    if (error) return error;

    const medicine = await MedicineModel.create({
      ...input,
      ...fields,
      normalizedName: normalizeSearchText(input.name),
      formGroup: toFormGroup(input.dosageForm),
    });
    return created("Medicine created", medicine);
  } catch (error) {
    return serverError("Failed to create medicine", error);
  }
};

export const getMedicines = async (query: ListMedicinesQuery) => {
  try {
    // Anchored, case-sensitive regex on lowercased fields: each side of the
    // $or uses its own index.
    const startsWith = query.search
      ? new RegExp(`^${escapeRegex(normalizeSearchText(query.search))}`)
      : null;

    const filter = {
      ...(startsWith && {
        $or: [
          { normalizedName: startsWith },
          { normalizedGenericName: startsWith },
        ],
      }),
      ...(query.generic && { generic: query.generic }),
      ...(query.formGroup && { formGroup: query.formGroup }),
      ...(query.type && { type: query.type }),
      ...(query.manufacturer && { manufacturer: query.manufacturer }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [medicines, total] = await Promise.all([
      MedicineModel.find(filter)
        .select(HIDDEN_FIELDS)
        .sort({ normalizedName: 1, strength: 1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .lean(),
      MedicineModel.countDocuments(filter),
    ]);

    return paginated(
      "Medicines fetched",
      medicines,
      buildPaginationMeta(query, total),
    );
  } catch (error) {
    return serverError("Failed to fetch medicines", error);
  }
};

/** Distinct manufacturers, for a filter dropdown. */
export const getManufacturers = async () => {
  try {
    const manufacturers = await MedicineModel.distinct("manufacturer", {
      manufacturer: { $ne: null },
    });
    return success("Manufacturers fetched", manufacturers.sort());
  } catch (error) {
    return serverError("Failed to fetch manufacturers", error);
  }
};

export const getMedicineById = async (id: string) => {
  try {
    const medicine = await MedicineModel.findById(id)
      .select(HIDDEN_FIELDS)
      .populate({ path: "generic", select: "name drugClass indication", model: GenericModel })
      .lean();
    if (!medicine) return notFound("Medicine not found");

    return success("Medicine fetched", medicine);
  } catch (error) {
    return serverError("Failed to fetch medicine", error);
  }
};

export const updateMedicine = async (
  id: string,
  { genericId, ...input }: UpdateMedicineInput,
) => {
  try {
    const update: Record<string, unknown> = { ...input };
    if (input.name) update.normalizedName = normalizeSearchText(input.name);
    if (input.dosageForm) update.formGroup = toFormGroup(input.dosageForm);

    if (genericId !== undefined) {
      const { fields, error } = await resolveGenericFields(genericId);
      if (error) return error;
      Object.assign(update, fields);
    }

    const medicine = await MedicineModel.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
    })
      .select(HIDDEN_FIELDS)
      .lean();
    if (!medicine) return notFound("Medicine not found");

    return success("Medicine updated", medicine);
  } catch (error) {
    return serverError("Failed to update medicine", error);
  }
};

// Safe to delete: consultations keep their own copy of each medicine.
export const deleteMedicine = async (id: string) => {
  try {
    const medicine = await MedicineModel.findByIdAndDelete(id)
      .select(HIDDEN_FIELDS)
      .lean();
    if (!medicine) return notFound("Medicine not found");

    return success("Medicine deleted", medicine);
  } catch (error) {
    return serverError("Failed to delete medicine", error);
  }
};
