import { redis, REDIS_PREFIX } from "../../config/redis";

/**
 * JSON cache on top of Redis.
 * Every helper swallows Redis errors: if Redis is down the app keeps
 * working, it just reads from MongoDB instead of the cache.
 */

const withPrefix = (key: string) => `${REDIS_PREFIX}${key}`;

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get(withPrefix(key));
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error(`[cache] get "${key}" failed`, error);
    return null;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
) => {
  try {
    await redis.set(withPrefix(key), JSON.stringify(value), {
      expiration: { type: "EX", value: ttlSeconds },
    });
  } catch (error) {
    console.error(`[cache] set "${key}" failed`, error);
  }
};

export const deleteCache = async (...keys: string[]) => {
  if (!keys.length) return;

  try {
    await redis.del(keys.map(withPrefix));
  } catch (error) {
    console.error(`[cache] delete failed`, error);
  }
};

/**
 * Returns the cached value, or runs `load`, caches its result and returns it.
 *
 *   const stats = await getOrSetCache("dashboard:summary", 60, loadSummary);
 */
export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const value = await load();
  await setCache(key, value, ttlSeconds);
  return value;
};
