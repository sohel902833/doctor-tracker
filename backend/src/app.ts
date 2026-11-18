import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { env } from "./config/env";
import { redis } from "./config/redis";
import routes from "./routes";
import { errorHandler } from "./shared/middlewares/errorHandler";
import { notFoundHandler } from "./shared/middlewares/notFoundHandler";
import { serviceUnavailable, success } from "./shared/utils/response";

const app = express();

// req.ip = the real client IP when the request came through a trusted
// proxy (the Next.js frontend), so rate limits count per user, not per proxy.
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  const services = {
    mongodb: mongoose.connection.readyState === 1 ? "up" : "down",
    redis: redis.isReady ? "up" : "down",
  };
  const healthy = Object.values(services).every((state) => state === "up");

  const result = healthy
    ? success("Server is healthy", services)
    : serviceUnavailable("Some services are down", services);
  res.status(result.status).json(result);
});

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
