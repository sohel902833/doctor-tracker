import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./shared/middlewares/errorHandler";
import { notFoundHandler } from "./shared/middlewares/notFoundHandler";
import { success } from "./shared/utils/response";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  const result = success("Server is healthy");
  res.status(result.status).json(result);
});

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
