import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import * as hospitalController from "./hospital.controller";
import {
  createHospitalSchema,
  hospitalIdParamSchema,
  listHospitalsQuerySchema,
  updateHospitalSchema,
} from "./hospital.validation";

const router = Router();

router.get(
  "/",
  validate(listHospitalsQuerySchema, "query"),
  hospitalController.getHospitals,
);
router.post(
  "/",
  validate(createHospitalSchema),
  hospitalController.createHospital,
);

router.get(
  "/:id",
  validate(hospitalIdParamSchema, "params"),
  hospitalController.getHospitalById,
);
router.patch(
  "/:id",
  validate(hospitalIdParamSchema, "params"),
  validate(updateHospitalSchema),
  hospitalController.updateHospital,
);
router.delete(
  "/:id",
  validate(hospitalIdParamSchema, "params"),
  hospitalController.deleteHospital,
);

export default router;
