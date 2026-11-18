import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as patientController from "./patient.controller";
import {
  listPatientsQuerySchema,
  lookupPatientQuerySchema,
  newPatientSchema,
  patientIdParamSchema,
  updatePatientSchema,
} from "./patient.validation";

const router = Router();

const MODULE = Modules.PATIENT;
const actions = appPermissions[MODULE];

// Must stay above "/:id"
router.get(
  "/lookup",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(lookupPatientQuerySchema, "query"),
  patientController.lookupPatient,
);

router.get(
  "/",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(listPatientsQuerySchema, "query"),
  patientController.getPatients,
);
router.post(
  "/",
  guard({ permission: `${MODULE}.${actions.create}` }),
  validate(newPatientSchema),
  patientController.createPatient,
);

router.get(
  "/:id",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(patientIdParamSchema, "params"),
  patientController.getPatientById,
);
router.patch(
  "/:id",
  guard({ permission: `${MODULE}.${actions.update}` }),
  validate(patientIdParamSchema, "params"),
  validate(updatePatientSchema),
  patientController.updatePatient,
);
router.delete(
  "/:id",
  guard({ permission: `${MODULE}.${actions.delete}` }),
  validate(patientIdParamSchema, "params"),
  patientController.deletePatient,
);

export default router;
