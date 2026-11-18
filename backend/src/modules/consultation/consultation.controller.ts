import type { RequestHandler } from "express";
import * as consultationService from "./consultation.service";
import type { ListConsultationsQuery } from "./consultation.validation";

type IdParams = { id: string };

// `guard` runs first on every consultation route, so req.user is always set.

export const createConsultation: RequestHandler = async (req, res) => {
  const result = await consultationService.createConsultation(
    req.body,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const getConsultations: RequestHandler = async (req, res) => {
  const result = await consultationService.getConsultations(
    req.query as unknown as ListConsultationsQuery,
    req.user!,
  );
  res.status(result.status).json(result);
};

export const getConsultationById: RequestHandler<IdParams> = async (
  req,
  res,
) => {
  const result = await consultationService.getConsultationById(
    req.params.id,
    req.user!,
  );
  res.status(result.status).json(result);
};
