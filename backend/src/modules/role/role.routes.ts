import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as roleController from "./role.controller";
import {
  createRoleSchema,
  roleIdParamSchema,
  updateRoleSchema,
} from "./role.validation";

const router = Router();

const MODULE = Modules.ROLE;
const actions = appPermissions[MODULE];

// Must stay above "/:id"
router.get(
  "/permissions",
  guard({ permission: `${MODULE}.${actions.read}` }),
  roleController.getPermissionCatalog,
);

router.get(
  "/",
  guard({ permission: `${MODULE}.${actions.read}` }),
  roleController.getRoles,
);
router.post(
  "/",
  guard({ permission: `${MODULE}.${actions.create}` }),
  validate(createRoleSchema),
  roleController.createRole,
);

router.get(
  "/:id",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(roleIdParamSchema, "params"),
  roleController.getRoleById,
);
router.patch(
  "/:id",
  guard({ permission: `${MODULE}.${actions.update}` }),
  validate(roleIdParamSchema, "params"),
  validate(updateRoleSchema),
  roleController.updateRole,
);
router.delete(
  "/:id",
  guard({ permission: `${MODULE}.${actions.delete}` }),
  validate(roleIdParamSchema, "params"),
  roleController.deleteRole,
);

export default router;
