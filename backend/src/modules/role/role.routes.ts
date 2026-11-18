import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import * as roleController from "./role.controller";
import {
  createRoleSchema,
  roleIdParamSchema,
  updateRoleSchema,
} from "./role.validation";

const router = Router();

// Must stay above "/:id"
router.get("/permissions", roleController.getPermissionCatalog);

router.get("/", roleController.getRoles);
router.post("/", validate(createRoleSchema), roleController.createRole);

router.get(
  "/:id",
  validate(roleIdParamSchema, "params"),
  roleController.getRoleById,
);
router.patch(
  "/:id",
  validate(roleIdParamSchema, "params"),
  validate(updateRoleSchema),
  roleController.updateRole,
);
router.delete(
  "/:id",
  validate(roleIdParamSchema, "params"),
  roleController.deleteRole,
);

export default router;
