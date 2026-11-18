import type { RequestHandler } from "express";
import * as authService from "./auth.service";

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(result.status).json(result);
};

export const register: RequestHandler = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(result.status).json(result);
};

// `authenticate` runs first, so req.user is always set here.
export const getProfile: RequestHandler = async (req, res) => {
  const result = await authService.getProfile(req.user!.id);
  res.status(result.status).json(result);
};
