import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as hospitalController from "./hospital.controller";
import {
  createHospitalSchema,
  hospitalIdParamSchema,
  listHospitalsQuerySchema,
  updateHospitalSchema,
} from "./hospital.validation";

const router = Router();

const MODULE = Modules.HOSPITAL;
const actions = appPermissions[MODULE];

router.get(
  "/",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(listHospitalsQuerySchema, "query"),
  hospitalController.getHospitals,
);
router.post(
  "/",
  guard({ permission: `${MODULE}.${actions.create}` }),
  validate(createHospitalSchema),
  hospitalController.createHospital,
);

router.get(
  "/:id",
  guard({ permission: `${MODULE}.${actions.read}` }),
  validate(hospitalIdParamSchema, "params"),
  hospitalController.getHospitalById,
);
router.patch(
  "/:id",
  guard({ permission: `${MODULE}.${actions.update}` }),
  validate(hospitalIdParamSchema, "params"),
  validate(updateHospitalSchema),
  hospitalController.updateHospital,
);
router.delete(
  "/:id",
  guard({ permission: `${MODULE}.${actions.delete}` }),
  validate(hospitalIdParamSchema, "params"),
  hospitalController.deleteHospital,
);

export default router;
