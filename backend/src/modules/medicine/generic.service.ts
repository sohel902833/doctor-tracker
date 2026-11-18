import { isDuplicateKeyError } from "../../shared/utils/mongo";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import { escapeRegex } from "../../shared/utils/query";
import {
  conflict,
  created,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { GenericModel } from "./generic.model";
import type {
  CreateGenericInput,
  ListGenericsQuery,
  UpdateGenericInput,
} from "./generic.validation";
import { MedicineModel } from "./medicine.model";
import { normalizeSearchText } from "./medicine.utils";

const HIDDEN_FIELDS = "-normalizedName";

const alreadyExists = () =>
  conflict("Generic already exists", {
    name: "A generic with this name already exists",
  });

export const createGeneric = async (input: CreateGenericInput) => {
  try {
    const generic = await GenericModel.create({
      ...input,
      normalizedName: normalizeSearchText(input.name),
    });
    return created("Generic created", generic);
  } catch (error) {
    if (isDuplicateKeyError(error)) return alreadyExists();
    return serverError("Failed to create generic", error);
  }
};

export const getGenerics = async (query: ListGenericsQuery) => {
  try {
    const filter = {
      ...(query.search && {
        normalizedName: new RegExp(
          `^${escapeRegex(normalizeSearchText(query.search))}`,
        ),
      }),
      ...(query.drugClass && {
        drugClass: new RegExp(escapeRegex(query.drugClass), "i"),
      }),
    };

    const [generics, total] = await Promise.all([
      GenericModel.find(filter)
        .select(HIDDEN_FIELDS)
        .sort({ normalizedName: 1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .lean(),
      GenericModel.countDocuments(filter),
    ]);

    return paginated(
      "Generics fetched",
      generics,
      buildPaginationMeta(query, total),
    );
  } catch (error) {
    return serverError("Failed to fetch generics", error);
  }
};

export const getGenericById = async (id: string) => {
  try {
    const generic = await GenericModel.findById(id).select(HIDDEN_FIELDS).lean();
    if (!generic) return notFound("Generic not found");

    const brandCount = await MedicineModel.countDocuments({ generic: id });
    return success("Generic fetched", { ...generic, brandCount });
  } catch (error) {
    return serverError("Failed to fetch generic", error);
  }
};

export const updateGeneric = async (id: string, input: UpdateGenericInput) => {
  try {
    const update = input.name
      ? { ...input, normalizedName: normalizeSearchText(input.name) }
      : input;

    const generic = await GenericModel.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
    })
      .select(HIDDEN_FIELDS)
      .lean();
    if (!generic) return notFound("Generic not found");

    // Brands keep a copy of the generic name for fast lists and search.
    if (input.name) {
      await MedicineModel.updateMany(
        { generic: id },
        {
          genericName: generic.name,
          normalizedGenericName: normalizeSearchText(generic.name),
        },
      );
    }

    return success("Generic updated", generic);
  } catch (error) {
    if (isDuplicateKeyError(error)) return alreadyExists();
    return serverError("Failed to update generic", error);
  }
};

export const deleteGeneric = async (id: string) => {
  try {
    const generic = await GenericModel.findById(id).select(HIDDEN_FIELDS).lean();
    if (!generic) return notFound("Generic not found");

    if (await MedicineModel.exists({ generic: id })) {
      return conflict("Generic is used by medicines and cannot be deleted");
    }

    await GenericModel.deleteOne({ _id: id });
    return success("Generic deleted", generic);
  } catch (error) {
    return serverError("Failed to delete generic", error);
  }
};
