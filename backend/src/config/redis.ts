import { createClient } from "redis";
import { env } from "./env";

const CONNECT_TIMEOUT_MS = 10_000;

/** Namespace for every key this app writes. */
export const REDIS_PREFIX = "doctor-tracker:";

export const redis = createClient({
  url: env.REDIS_URL,
  // Fail commands right away while disconnected instead of queueing them,
  // so callers (e.g. the cache) can fall back instead of hanging.
  disableOfflineQueue: true,
  socket: {
    // Keep retrying after a drop: 100ms, 200ms, ... capped at 3s.
    reconnectStrategy: (retries) => Math.min(retries * 100, 3_000),
  },
});

// Without an error listener, a dropped connection would crash the process.
redis.on("error", (error: Error) => console.error("[redis]", error.message));

/** connect() retries forever when Redis is down, so give startup a deadline. */
export const connectRedis = async () => {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Redis connection timed out after ${CONNECT_TIMEOUT_MS}ms`)),
      CONNECT_TIMEOUT_MS,
    );
  });

  try {
    await Promise.race([redis.connect(), timeout]);
    console.log("Redis connected");
  } catch (error) {
    redis.destroy();
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const disconnectRedis = async () => {
  if (!redis.isOpen) return;

  await redis.close();
  console.log("Redis disconnected");
};
