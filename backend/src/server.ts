import app from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { connectRedis, disconnectRedis } from "./config/redis";
import { runSeed } from "./database/seed";

const start = async () => {
  try {
    await Promise.all([connectDB(), connectRedis()]);

    const server = app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);

      // Roles, first admin, medicine catalog: only what is missing.
      // Runs in the background so it never delays or blocks startup.
      runSeed().catch((error) => console.error("[seed] Seed failed", error));
    });

    const shutdown = (signal: string) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await Promise.allSettled([disconnectDB(), disconnectRedis()]);
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
