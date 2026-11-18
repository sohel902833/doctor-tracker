import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as consultationController from "./consultation.controller";
import {
  consultationIdParamSchema,
  createConsultationSchema,
  listConsultationsQuerySchema,
} from "./consultation.validation";

const router = Router();

const MODULE = Modules.CONSULTATION;
const actions = appPermissions[MODULE];

router.get(
  "/",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(listConsultationsQuerySchema, "query"),
  consultationController.getConsultations,
);
router.post(
  "/",
  guard({ permission: `${MODULE}.${actions.create}` }),
  validate(createConsultationSchema),
  consultationController.createConsultation,
);
router.get(
  "/:id",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(consultationIdParamSchema, "params"),
  consultationController.getConsultationById,
);

export default router;
