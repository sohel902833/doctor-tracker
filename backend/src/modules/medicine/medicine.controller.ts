import type { RequestHandler } from "express";
import * as medicineService from "./medicine.service";
import type { ListMedicinesQuery } from "./medicine.validation";

type IdParams = { id: string };

export const createMedicine: RequestHandler = async (req, res) => {
  const result = await medicineService.createMedicine(req.body);
  res.status(result.status).json(result);
};

export const getMedicines: RequestHandler = async (req, res) => {
  const result = await medicineService.getMedicines(
    req.query as unknown as ListMedicinesQuery,
  );
  res.status(result.status).json(result);
};

export const getManufacturers: RequestHandler = async (_req, res) => {
  const result = await medicineService.getManufacturers();
  res.status(result.status).json(result);
};

export const getMedicineById: RequestHandler<IdParams> = async (req, res) => {
  const result = await medicineService.getMedicineById(req.params.id);
  res.status(result.status).json(result);
};

export const updateMedicine: RequestHandler<IdParams> = async (req, res) => {
  const result = await medicineService.updateMedicine(req.params.id, req.body);
  res.status(result.status).json(result);
};

export const deleteMedicine: RequestHandler<IdParams> = async (req, res) => {
  const result = await medicineService.deleteMedicine(req.params.id);
  res.status(result.status).json(result);
};
