import { Router, type RequestHandler } from "express";
import { env } from "../../config/env";
import { authenticate } from "../../shared/middlewares/authenticate";
import { validate } from "../../shared/middlewares/validate";
import { forbidden } from "../../shared/utils/response";
import * as authController from "./auth.controller";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "./auth.validation";

const router = Router();

const ensureRegistrationEnabled: RequestHandler = (_req, res, next) => {
  if (env.ENABLE_REGISTRATION) return next();

  const result = forbidden("Registration is currently disabled");
  res.status(result.status).json(result);
};

router.post("/login", validate(loginSchema), authController.login);
router.post(
  "/register",
  ensureRegistrationEnabled,
  validate(registerSchema),
  authController.register,
);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post(
  "/logout",
  authenticate,
  validate(logoutSchema),
  authController.logout,
);
router.get("/profile", authenticate, authController.getProfile);

export default router;
