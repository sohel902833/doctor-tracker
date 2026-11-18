import app from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { connectRedis, disconnectRedis } from "./config/redis";

const start = async () => {
  try {
    await Promise.all([connectDB(), connectRedis()]);

    const server = app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
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
