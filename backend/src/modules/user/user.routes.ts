import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as userController from "./user.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "./user.validation";

const router = Router();

const MODULE = Modules.USER;
const actions = appPermissions[MODULE];

router.get(
  "/",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(listUsersQuerySchema, "query"),
  userController.getUsers,
);
router.post(
  "/",
  guard({ permission: `${MODULE}.${actions.create}` }),
  validate(createUserSchema),
  userController.createUser,
);

router.get(
  "/:id",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(userIdParamSchema, "params"),
  userController.getUserById,
);
router.patch(
  "/:id",
  guard({ permission: `${MODULE}.${actions.update}` }),
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema),
  userController.updateUser,
);
router.delete(
  "/:id",
  guard({ permission: `${MODULE}.${actions.delete}` }),
  validate(userIdParamSchema, "params"),
  userController.deleteUser,
);

export default router;
