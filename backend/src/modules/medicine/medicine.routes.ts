import { Router } from "express";
import { guard } from "../../shared/middlewares/guard";
import { validate } from "../../shared/middlewares/validate";
import {
  appPermissions,
  Modules,
} from "../../shared/permissions/appPermissions";
import * as genericController from "./generic.controller";
import {
  createGenericSchema,
  genericIdParamSchema,
  listGenericsQuerySchema,
  updateGenericSchema,
} from "./generic.validation";
import * as medicineController from "./medicine.controller";
import {
  createMedicineSchema,
  listMedicinesQuerySchema,
  medicineIdParamSchema,
  updateMedicineSchema,
} from "./medicine.validation";

// Mounted at /medicines. Generics share the medicine permissions.
const router = Router();

const MODULE = Modules.MEDICINE;
const actions = appPermissions[MODULE];

const canRead = guard({ permission: `${MODULE}.${actions.read}` });
const canCreate = guard({ permission: `${MODULE}.${actions.create}` });
const canUpdate = guard({ permission: `${MODULE}.${actions.update}` });
const canDelete = guard({ permission: `${MODULE}.${actions.delete}` });

// ---------- Generics (must stay above "/:id") ----------

router.get(
  "/generics",
  canRead,
  validate(listGenericsQuerySchema, "query"),
  genericController.getGenerics,
);
router.post(
  "/generics",
  canCreate,
  validate(createGenericSchema),
  genericController.createGeneric,
);
router.get(
  "/generics/:id",
  canRead,
  validate(genericIdParamSchema, "params"),
  genericController.getGenericById,
);
router.patch(
  "/generics/:id",
  canUpdate,
  validate(genericIdParamSchema, "params"),
  validate(updateGenericSchema),
  genericController.updateGeneric,
);
router.delete(
  "/generics/:id",
  canDelete,
  validate(genericIdParamSchema, "params"),
  genericController.deleteGeneric,
);

// ---------- Medicines ----------

router.get("/manufacturers", canRead, medicineController.getManufacturers);

router.get(
  "/",
  canRead,
  validate(listMedicinesQuerySchema, "query"),
  medicineController.getMedicines,
);
router.post(
  "/",
  canCreate,
  validate(createMedicineSchema),
  medicineController.createMedicine,
);
router.get(
  "/:id",
  canRead,
  validate(medicineIdParamSchema, "params"),
  medicineController.getMedicineById,
);
router.patch(
  "/:id",
  canUpdate,
  validate(medicineIdParamSchema, "params"),
  validate(updateMedicineSchema),
  medicineController.updateMedicine,
);
router.delete(
  "/:id",
  canDelete,
  validate(medicineIdParamSchema, "params"),
  medicineController.deleteMedicine,
);

export default router;
