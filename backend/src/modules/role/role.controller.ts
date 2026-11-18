import type { RequestHandler } from "express";
import * as roleService from "./role.service";

type IdParams = { id: string };

export const getPermissionCatalog: RequestHandler = (_req, res) => {
  const result = roleService.getPermissionCatalog();
  res.status(result.status).json(result);
};

export const createRole: RequestHandler = async (req, res) => {
  const result = await roleService.createRole(req.body);
  res.status(result.status).json(result);
};

export const getRoles: RequestHandler = async (_req, res) => {
  const result = await roleService.getRoles();
  res.status(result.status).json(result);
};

export const getRoleById: RequestHandler<IdParams> = async (req, res) => {
  const result = await roleService.getRoleById(req.params.id);
  res.status(result.status).json(result);
};

export const updateRole: RequestHandler<IdParams> = async (req, res) => {
  const result = await roleService.updateRole(req.params.id, req.body);
  res.status(result.status).json(result);
};

export const deleteRole: RequestHandler<IdParams> = async (req, res) => {
  const result = await roleService.deleteRole(req.params.id);
  res.status(result.status).json(result);
};
