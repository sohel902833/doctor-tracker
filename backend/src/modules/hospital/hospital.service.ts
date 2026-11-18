import { caseInsensitive } from "../../shared/utils/collation";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import { buildSearchFilter } from "../../shared/utils/query";
import {
  conflict,
  created,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { UserModel } from "../user/user.model";
import { HospitalModel } from "./hospital.model";
import type {
  CreateHospitalInput,
  ListHospitalsQuery,
  UpdateHospitalInput,
} from "./hospital.validation";

const nameTaken = { name: "A hospital with this name already exists" };

const isNameTaken = (name: string, excludeId?: string) =>
  HospitalModel.exists(
    excludeId ? { name, _id: { $ne: excludeId } } : { name },
  ).collation(caseInsensitive);

export const createHospital = async (input: CreateHospitalInput) => {
  try {
    if (await isNameTaken(input.name)) {
      return conflict("Hospital already exists", nameTaken);
    }

    const hospital = await HospitalModel.create(input);
    return created("Hospital created", hospital);
  } catch (error) {
    return serverError("Failed to create hospital", error);
  }
};

export const getHospitals = async (query: ListHospitalsQuery) => {
  try {
    const filter = buildSearchFilter(query.search, ["name", "address"]);

    const [hospitals, total] = await Promise.all([
      HospitalModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .lean(),
      HospitalModel.countDocuments(filter),
    ]);

    return paginated(
      "Hospitals fetched",
      hospitals,
      buildPaginationMeta(query, total),
    );
  } catch (error) {
    return serverError("Failed to fetch hospitals", error);
  }
};

export const getHospitalById = async (id: string) => {
  try {
    const hospital = await HospitalModel.findById(id).lean();
    if (!hospital) return notFound("Hospital not found");

    return success("Hospital fetched", hospital);
  } catch (error) {
    return serverError("Failed to fetch hospital", error);
  }
};

export const updateHospital = async (
  id: string,
  input: UpdateHospitalInput,
) => {
  try {
    if (input.name && (await isNameTaken(input.name, id))) {
      return conflict("Hospital already exists", nameTaken);
    }

    const hospital = await HospitalModel.findByIdAndUpdate(id, input, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!hospital) return notFound("Hospital not found");

    return success("Hospital updated", hospital);
  } catch (error) {
    return serverError("Failed to update hospital", error);
  }
};

export const deleteHospital = async (id: string) => {
  try {
    const hospital = await HospitalModel.findById(id).lean();
    if (!hospital) return notFound("Hospital not found");

    if (await UserModel.exists({ "hospitals.hospital": id })) {
      return conflict("Hospital is linked to users and cannot be deleted");
    }

    await HospitalModel.deleteOne({ _id: id });
    return success("Hospital deleted", hospital);
  } catch (error) {
    return serverError("Failed to delete hospital", error);
  }
};
