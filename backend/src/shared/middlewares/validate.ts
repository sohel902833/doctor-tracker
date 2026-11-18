import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { formatZodErrors } from "../utils/formatZodErrors";
import { validationError } from "../utils/response";

type RequestSource = "body" | "params" | "query";

/**
 * Validates req[source] against a Zod schema.
 * On failure it responds with { errors: { field: message } }.
 * On success it replaces req[source] with the parsed (trimmed, coerced) data.
 *
 *   router.post("/", validate(createDoctorSchema), createDoctor)
 *   router.get("/:id", validate(idParamSchema, "params"), getDoctorById)
 */
export const validate =
  (schema: ZodType, source: RequestSource = "body"): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const response = validationError(formatZodErrors(result.error));
      res.status(response.status).json(response);
      return;
    }

    // Express 5 makes req.query a getter, so plain assignment does not work.
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    next();
  };
