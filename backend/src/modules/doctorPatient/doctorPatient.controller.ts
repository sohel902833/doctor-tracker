import type { RequestHandler } from "express";
import * as doctorPatientService from "./doctorPatient.service";
import type {
  DoctorPatientConsultationsQuery,
  ListDoctorPatientsQuery,
} from "./doctorPatient.validation";

type DoctorParams = { doctorId: string };
type DoctorPatientParams = DoctorParams & { patientId: string };

// `guard` runs first on every route here, so req.user is always set.

export const getDoctorPatients: RequestHandler<DoctorParams> = async (
  req,
  res,
) => {
  const result = await doctorPatientService.getDoctorPatients(
    req.params.doctorId,
    req.query as unknown as ListDoctorPatientsQuery,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const addPatientToDoctor: RequestHandler<DoctorParams> = async (
  req,
  res,
) => {
  const result = await doctorPatientService.addPatientToDoctor(
    req.params.doctorId,
    req.body,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const removePatientFromDoctor: RequestHandler<
  DoctorPatientParams
> = async (req, res) => {
  const result = await doctorPatientService.removePatientFromDoctor(
    req.params.doctorId,
    req.params.patientId,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const getDoctorPatientConsultations: RequestHandler<
  DoctorPatientParams
> = async (req, res) => {
  const result = await doctorPatientService.getDoctorPatientConsultations(
    req.params.doctorId,
    req.params.patientId,
    req.query as unknown as DoctorPatientConsultationsQuery,
    req.user!,
  );
  res.status(result.status).json(result);
};
