import type { RequestHandler } from "express";
import * as patientService from "./patient.service";
import type { ListPatientsQuery } from "./patient.validation";

type IdParams = { id: string };

// `guard` runs first on every patient route, so req.user is always set.

export const createPatient: RequestHandler = async (req, res) => {
  const result = await patientService.createPatient(req.body);
  res.status(result.status).json(result);
};

export const getPatients: RequestHandler = async (req, res) => {
  const result = await patientService.getPatients(
    req.query as unknown as ListPatientsQuery,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const lookupPatient: RequestHandler = async (req, res) => {
  const result = await patientService.lookupPatientByPhone(
    String(req.query.phone),
    req.user!,
  );
  res.status(result.status).json(result);
};

export const getPatientById: RequestHandler<IdParams> = async (req, res) => {
  const result = await patientService.getPatientById(req.params.id, req.user!);
  res.status(result.status).json(result);
};

export const updatePatient: RequestHandler<IdParams> = async (req, res) => {
  const result = await patientService.updatePatient(
    req.params.id,
    req.body,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const deletePatient: RequestHandler<IdParams> = async (req, res) => {
  const result = await patientService.deletePatient(req.params.id);
  res.status(result.status).json(result);
};
