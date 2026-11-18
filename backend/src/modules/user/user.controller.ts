import type { RequestHandler } from "express";
import * as userService from "./user.service";
import type { ListUsersQuery } from "./user.validation";

type IdParams = { id: string };

export const createUser: RequestHandler = async (req, res) => {
  const result = await userService.createUser(req.body);
  res.status(result.status).json(result);
};

export const getUsers: RequestHandler = async (req, res) => {
  const result = await userService.getUsers(
    req.query as unknown as ListUsersQuery,
  );
  res.status(result.status).json(result);
};

export const getUserById: RequestHandler<IdParams> = async (req, res) => {
  const result = await userService.getUserById(req.params.id);
  res.status(result.status).json(result);
};

export const updateUser: RequestHandler<IdParams> = async (req, res) => {
  const result = await userService.updateUser(req.params.id, req.body);
  res.status(result.status).json(result);
};

export const deleteUser: RequestHandler<IdParams> = async (req, res) => {
  const result = await userService.deleteUser(req.params.id);
  res.status(result.status).json(result);
};
