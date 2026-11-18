import { model, Schema, type InferSchemaType } from "mongoose";
import { USER_TYPES } from "../../shared/constants/userTypes";
import type { RolePermissions } from "../../shared/permissions/permission.utils";
import { caseInsensitive } from "../../shared/utils/collation";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    userType: { type: String, enum: USER_TYPES, required: true },
    permissions: {
      type: Schema.Types.Mixed as unknown as RolePermissions,
      default: {},
    },
    // Roles whose users this role can see/manage (e.g. Doctor -> Patient).
    subordinateRoles: {
      type: [{ type: Schema.Types.ObjectId, ref: "Role" }],
      default: [],
    },
  },
  // minimize: false keeps an empty permissions object instead of dropping it
  { timestamps: true, versionKey: false, minimize: false },
);

roleSchema.index({ name: 1 }, { unique: true, collation: caseInsensitive });

export type Role = InferSchemaType<typeof roleSchema>;

export const RoleModel = model("Role", roleSchema);
