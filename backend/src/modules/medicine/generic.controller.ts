import type { RequestHandler } from "express";
import * as genericService from "./generic.service";
import type { ListGenericsQuery } from "./generic.validation";

type IdParams = { id: string };

export const createGeneric: RequestHandler = async (req, res) => {
  const result = await genericService.createGeneric(req.body);
  res.status(result.status).json(result);
};

export const getGenerics: RequestHandler = async (req, res) => {
  const result = await genericService.getGenerics(
    req.query as unknown as ListGenericsQuery,
  );
  res.status(result.status).json(result);
};

export const getGenericById: RequestHandler<IdParams> = async (req, res) => {
  const result = await genericService.getGenericById(req.params.id);
  res.status(result.status).json(result);
};

export const updateGeneric: RequestHandler<IdParams> = async (req, res) => {
  const result = await genericService.updateGeneric(req.params.id, req.body);
  res.status(result.status).json(result);
};

export const deleteGeneric: RequestHandler<IdParams> = async (req, res) => {
  const result = await genericService.deleteGeneric(req.params.id);
  res.status(result.status).json(result);
};
