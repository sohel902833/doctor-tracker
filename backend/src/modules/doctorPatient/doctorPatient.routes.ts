import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as doctorPatientController from "./doctorPatient.controller";
import {
  addDoctorPatientSchema,
  doctorParamSchema,
  doctorPatientConsultationsQuerySchema,
  doctorPatientParamSchema,
  listDoctorPatientsQuerySchema,
} from "./doctorPatient.validation";

// Mounted at /doctors. ":doctorId" may be "me" for the logged-in doctor.
const router = Router();

const PATIENT = Modules.PATIENT;
const patientActions = appPermissions[PATIENT];
const CONSULTATION = Modules.CONSULTATION;
const consultationActions = appPermissions[CONSULTATION];

router.get(
  "/:doctorId/patients",
  guard({ permission: `${PATIENT}.${patientActions.read}` }),
  validate(doctorParamSchema, "params"),
  validate(listDoctorPatientsQuerySchema, "query"),
  doctorPatientController.getDoctorPatients,
);
router.post(
  "/:doctorId/patients",
  guard({ permission: `${PATIENT}.${patientActions.create}` }),
  validate(doctorParamSchema, "params"),
  validate(addDoctorPatientSchema),
  doctorPatientController.addPatientToDoctor,
);
router.delete(
  "/:doctorId/patients/:patientId",
  guard({ permission: `${PATIENT}.${patientActions.update}` }),
  validate(doctorPatientParamSchema, "params"),
  doctorPatientController.removePatientFromDoctor,
);
router.get(
  "/:doctorId/patients/:patientId/consultations",
  guard({ permission: `${CONSULTATION}.${consultationActions.read}` }),
  validate(doctorPatientParamSchema, "params"),
  validate(doctorPatientConsultationsQuerySchema, "query"),
  doctorPatientController.getDoctorPatientConsultations,
);

export default router;
