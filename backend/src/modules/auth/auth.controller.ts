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

export const refresh: RequestHandler = async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(result.status).json(result);
};

// `authenticate` runs first on the routes below, so req.user is always set.

export const logout: RequestHandler = async (req, res) => {
  const result = await authService.logout(req.authTokenId!, req.body);
  res.status(result.status).json(result);
};

export const getProfile: RequestHandler = (req, res) => {
  const result = authService.getProfile(req.user!);
  res.status(result.status).json(result);
};
