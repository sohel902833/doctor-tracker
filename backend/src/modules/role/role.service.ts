import {
  normalizePermissions,
  permissionCatalog,
} from "../../shared/permissions/permission.utils";
import {
  badRequest,
  conflict,
  created,
  notFound,
  serverError,
  success,
} from "../../shared/utils/response";
import { caseInsensitive } from "../../shared/utils/collation";
import { UserModel } from "../user/user.model";
import { RoleModel } from "./role.model";
import type { CreateRoleInput, UpdateRoleInput } from "./role.validation";

const nameTaken = { name: "A role with this name already exists" };

const isNameTaken = (name: string, excludeId?: string) =>
  RoleModel.exists(
    excludeId ? { name, _id: { $ne: excludeId } } : { name },
  ).collation(caseInsensitive);

const subordinatePopulate = { path: "subordinateRoles", select: "name userType" };

const hasMissingRoles = async (ids?: string[]) => {
  if (!ids?.length) return false;

  const found = await RoleModel.countDocuments({ _id: { $in: ids } });
  return found !== ids.length;
};

const invalidSubordinates = (message: string) =>
  badRequest("Invalid subordinate roles", { subordinateRoles: message });

export const getPermissionCatalog = () =>
  success("Permissions fetched", permissionCatalog);

export const createRole = async (input: CreateRoleInput) => {
  try {
    if (await isNameTaken(input.name)) {
      return conflict("Role already exists", nameTaken);
    }

    if (await hasMissingRoles(input.subordinateRoles)) {
      return invalidSubordinates("One or more roles were not found");
    }

    const role = await RoleModel.create({
      ...input,
      permissions: normalizePermissions(input.permissions),
    });
    await role.populate(subordinatePopulate);
    return created("Role created", role);
  } catch (error) {
    return serverError("Failed to create role", error);
  }
};

export const getRoles = async () => {
  try {
    const roles = await RoleModel.find()
      .sort({ createdAt: -1 })
      .populate(subordinatePopulate)
      .lean();
    return success("Roles fetched", roles);
  } catch (error) {
    return serverError("Failed to fetch roles", error);
  }
};

export const getRoleById = async (id: string) => {
  try {
    const role = await RoleModel.findById(id)
      .populate(subordinatePopulate)
      .lean();
    if (!role) return notFound("Role not found");

    return success("Role fetched", role);
  } catch (error) {
    return serverError("Failed to fetch role", error);
  }
};

export const updateRole = async (id: string, input: UpdateRoleInput) => {
  try {
    if (input.name && (await isNameTaken(input.name, id))) {
      return conflict("Role already exists", nameTaken);
    }

    if (input.subordinateRoles?.includes(id)) {
      return invalidSubordinates("A role cannot be its own subordinate");
    }
    if (await hasMissingRoles(input.subordinateRoles)) {
      return invalidSubordinates("One or more roles were not found");
    }

    const update = input.permissions
      ? { ...input, permissions: normalizePermissions(input.permissions) }
      : input;

    const role = await RoleModel.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate(subordinatePopulate)
      .lean();
    if (!role) return notFound("Role not found");

    // Users keep a copy of userType, so keep it in sync with the role.
    if (input.userType) {
      await UserModel.updateMany(
        { role: id, userType: { $ne: input.userType } },
        { userType: input.userType },
      );
    }

    return success("Role updated", role);
  } catch (error) {
    return serverError("Failed to update role", error);
  }
};

export const deleteRole = async (id: string) => {
  try {
    const role = await RoleModel.findById(id).lean();
    if (!role) return notFound("Role not found");

    if (await UserModel.exists({ role: id })) {
      return conflict("Role is assigned to users and cannot be deleted");
    }

    await RoleModel.deleteOne({ _id: id });
    // Remove the deleted role from every other role's subordinate list.
    await RoleModel.updateMany(
      { subordinateRoles: id },
      { $pull: { subordinateRoles: id } },
    );
    return success("Role deleted", role);
  } catch (error) {
    return serverError("Failed to delete role", error);
  }
};
