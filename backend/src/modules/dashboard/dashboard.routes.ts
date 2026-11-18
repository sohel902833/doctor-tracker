import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { validate } from "../../shared/middlewares/validate";
import * as dashboardController from "./dashboard.controller";
import { dashboardQuerySchema } from "./dashboard.validation";

const router = Router();

// Any logged-in staff member: the service scopes the numbers
// (admins see the clinic, doctors see their own practice).
router.get(
  "/",
  authenticate,
  validate(dashboardQuerySchema, "query"),
  dashboardController.getDashboard,
);

export default router;
