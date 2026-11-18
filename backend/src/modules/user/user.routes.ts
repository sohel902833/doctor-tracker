import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import * as userController from "./user.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "./user.validation";

const router = Router();

router.get(
  "/",
  validate(listUsersQuerySchema, "query"),
  userController.getUsers,
);
router.post("/", validate(createUserSchema), userController.createUser);

router.get(
  "/:id",
  validate(userIdParamSchema, "params"),
  userController.getUserById,
);
router.patch(
  "/:id",
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema),
  userController.updateUser,
);
router.delete(
  "/:id",
  validate(userIdParamSchema, "params"),
  userController.deleteUser,
);

export default router;
