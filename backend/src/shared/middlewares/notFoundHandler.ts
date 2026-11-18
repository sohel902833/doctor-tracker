import type { RequestHandler } from "express";
import { notFound } from "../utils/response";

export const notFoundHandler: RequestHandler = (req, res) => {
  const result = notFound(`Route ${req.method} ${req.originalUrl} not found`);
  res.status(result.status).json(result);
};
