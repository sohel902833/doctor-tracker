import type { RequestHandler } from "express";
import * as hospitalService from "./hospital.service";
import type { ListHospitalsQuery } from "./hospital.validation";

type IdParams = { id: string };

export const createHospital: RequestHandler = async (req, res) => {
  const result = await hospitalService.createHospital(req.body);
  res.status(result.status).json(result);
};

export const getHospitals: RequestHandler = async (req, res) => {
  const result = await hospitalService.getHospitals(
    req.query as unknown as ListHospitalsQuery,
  );
  res.status(result.status).json(result);
};

export const getHospitalById: RequestHandler<IdParams> = async (req, res) => {
  const result = await hospitalService.getHospitalById(req.params.id);
  res.status(result.status).json(result);
};

export const updateHospital: RequestHandler<IdParams> = async (req, res) => {
  const result = await hospitalService.updateHospital(req.params.id, req.body);
  res.status(result.status).json(result);
};

export const deleteHospital: RequestHandler<IdParams> = async (req, res) => {
  const result = await hospitalService.deleteHospital(req.params.id);
  res.status(result.status).json(result);
};
