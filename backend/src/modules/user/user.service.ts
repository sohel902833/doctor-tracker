import bcrypt from "bcryptjs";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import {
  buildDateRangeFilter,
  buildSearchFilter,
  escapeRegex,
} from "../../shared/utils/query";
import {
  badRequest,
  conflict,
  created,
  notFound,
  paginated,
  serverError,
  success,
  type FieldErrors,
} from "../../shared/utils/response";
import {
  clearSessionProfile,
  syncSessionProfile,
} from "../auth/session";
import { HospitalModel } from "../hospital/hospital.model";
import { RoleModel } from "../role/role.model";
import { UserModel } from "./user.model";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "./user.validation";

const SALT_ROUNDS = 10;

const userPopulate = [
  { path: "role", select: "name userType" },
  { path: "hospitals.hospital", select: "name" },
];

// ---------- Checks ----------

/** Returns { email, phone } errors for values already used by another user. */
const findTakenFields = async (
  { email, phone }: { email?: string; phone?: string | null },
  excludeId?: string,
) => {
  const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};

  const [emailTaken, phoneTaken] = await Promise.all([
    email ? UserModel.exists({ email, ...notSelf }) : null,
    phone ? UserModel.exists({ phone, ...notSelf }) : null,
  ]);

  const errors: FieldErrors = {};
  if (emailTaken) errors.email = "Email is already in use";
  if (phoneTaken) errors.phone = "Phone is already in use";

  return Object.keys(errors).length ? errors : null;
};

const hasMissingHospitals = async (hospitals?: { hospital: string }[]) => {
  if (!hospitals?.length) return false;

  const ids = [...new Set(hospitals.map((entry) => entry.hospital))];
  const found = await HospitalModel.countDocuments({ _id: { $in: ids } });
  return found !== ids.length;
};

const findUserWithRelations = (id: string) =>
  UserModel.findById(id).populate(userPopulate).lean();

// ---------- Services ----------

export const createUser = async (input: CreateUserInput) => {
  try {
    const takenFields = await findTakenFields(input);
    if (takenFields) return conflict("User already exists", takenFields);

    const role = await RoleModel.findById(input.role).select("userType").lean();
    if (!role) return badRequest("Invalid role", { role: "Role not found" });

    if (await hasMissingHospitals(input.hospitals)) {
      return badRequest("Invalid hospitals", {
        hospitals: "One or more hospitals were not found",
      });
    }

    const user = await UserModel.create({
      ...input,
      password: await bcrypt.hash(input.password, SALT_ROUNDS),
      userType: role.userType,
    });

    return created(
      "User created",
      await findUserWithRelations(user._id.toString()),
    );
  } catch (error) {
    return serverError("Failed to create user", error);
  }
};

export const getUsers = async (query: ListUsersQuery) => {
  try {
    const filter = {
      ...buildSearchFilter(query.search, ["name", "email", "phone"]),
      ...buildDateRangeFilter("createdAt", query.createdFrom, query.createdTo),
      ...(query.userType && { userType: query.userType }),
      ...(query.role && { role: query.role }),
      ...(query.hospital && { "hospitals.hospital": query.hospital }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.specialization && {
        specialization: new RegExp(escapeRegex(query.specialization), "i"),
      }),
    };

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .populate(userPopulate)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return paginated("Users fetched", users, buildPaginationMeta(query, total));
  } catch (error) {
    return serverError("Failed to fetch users", error);
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await findUserWithRelations(id);
    if (!user) return notFound("User not found");

    return success("User fetched", user);
  } catch (error) {
    return serverError("Failed to fetch user", error);
  }
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  try {
    if (!(await UserModel.exists({ _id: id }))) {
      return notFound("User not found");
    }

    const takenFields = await findTakenFields(input, id);
    if (takenFields) return conflict("User already exists", takenFields);

    const update: Record<string, unknown> = { ...input };

    if (input.role) {
      const role = await RoleModel.findById(input.role)
        .select("userType")
        .lean();
      if (!role) return badRequest("Invalid role", { role: "Role not found" });

      update.userType = role.userType;
    }

    if (await hasMissingHospitals(input.hospitals)) {
      return badRequest("Invalid hospitals", {
        hospitals: "One or more hospitals were not found",
      });
    }

    if (input.password) {
      update.password = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    await UserModel.updateOne({ _id: id }, update, { runValidators: true });
    await syncSessionProfile(id);
    return success("User updated", await findUserWithRelations(id));
  } catch (error) {
    return serverError("Failed to update user", error);
  }
};

export const deleteUser = async (id: string) => {
  try {
    const user = await UserModel.findByIdAndDelete(id).lean();
    if (!user) return notFound("User not found");

    await clearSessionProfile(id);

    return success("User deleted", user);
  } catch (error) {
    return serverError("Failed to delete user", error);
  }
};
