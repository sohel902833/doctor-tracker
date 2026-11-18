import type { Request, RequestHandler } from "express";
import { redis, REDIS_PREFIX } from "../../config/redis";
import { tooManyRequests } from "../utils/response";

export type RateLimitOptions = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Who is counted. Default: the logged-in user, otherwise the IP. */
  by?: "user" | "ip";
};

/** e.g. "POST:/api/v1/auth/login", so each route has its own counter. */
const routeId = (req: Request) =>
  `${req.method}:${req.baseUrl}${req.route?.path ?? req.path}`;

const clientId = (req: Request, by: RateLimitOptions["by"]) =>
  by !== "ip" && req.user ? `user:${req.user._id}` : `ip:${req.ip}`;

/**
 * Fixed-window rate limit stored in Redis, so the count is shared by
 * every server instance. If Redis is down the request is allowed:
 * rate limiting should never take the API down with it.
 */
export const rateLimit =
  ({ limit, windowSeconds, by }: RateLimitOptions): RequestHandler =>
  async (req, res, next) => {
    const key = `${REDIS_PREFIX}ratelimit:${routeId(req)}:${clientId(req, by)}`;

    let count: number;
    let secondsLeft: number;
    try {
      const [incremented, , ttl] = await redis
        .multi()
        .incr(key)
        .expire(key, windowSeconds, "NX") // starts the window on the first hit
        .ttl(key)
        .exec();
      count = Number(incremented);
      secondsLeft = Number(ttl);
    } catch (error) {
      console.error("[rateLimit] Redis unavailable, allowing request", error);
      return next();
    }

    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", Math.max(limit - count, 0));
    res.setHeader("RateLimit-Reset", secondsLeft);

    if (count > limit) {
      res.setHeader("Retry-After", secondsLeft);
      const result = tooManyRequests();
      res.status(result.status).json(result);
      return;
    }

    next();
  };
