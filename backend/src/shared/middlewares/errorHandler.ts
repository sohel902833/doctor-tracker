import type { ErrorRequestHandler } from "express";
import { badRequest, serverError } from "../utils/response";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const result =
    err?.type === "entity.parse.failed"
      ? badRequest("Invalid JSON payload")
      : serverError("Something went wrong", err);

  res.status(result.status).json(result);
};
