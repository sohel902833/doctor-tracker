import type { RequestHandler } from "express";
import * as dashboardService from "./dashboard.service";
import type { DashboardQuery } from "./dashboard.validation";

// `authenticate` runs first, so req.user is always set.
export const getDashboard: RequestHandler = async (req, res) => {
  const result = await dashboardService.getDashboard(
    req.query as unknown as DashboardQuery,
    req.user!,
  );
  res.status(result.status).json(result);
};
