import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { redis, REDIS_PREFIX } from "../../config/redis";
import type { RolePermissions } from "../../shared/permissions/permission.utils";
import { signToken, verifyToken, type TokenType } from "../../shared/utils/jwt";
import { HospitalModel } from "../hospital/hospital.model";
import { RoleModel } from "../role/role.model";
import { UserModel } from "../user/user.model";

export type SessionRole = {
  _id: string;
  name: string;
  userType: string;
  permissions: RolePermissions;
  subordinateRoles: string[];
};

export type SessionProfile = {
  _id: string;
  name: string;
  email: string;
  userType: string;
  isActive: boolean;
  role: SessionRole;
  [field: string]: unknown;
};

const keys = {
  authToken: (tokenId: string) => `${REDIS_PREFIX}authtoken:${tokenId}`,
  refreshToken: (tokenId: string) => `${REDIS_PREFIX}refreshtoken:${tokenId}`,
  profile: (userId: string) => `${REDIS_PREFIX}profile:${userId}`,
};

const expiresIn = (seconds: number) => ({
  expiration: { type: "EX", value: seconds } as const,
});

const ROLE_FIELDS = "name userType permissions subordinateRoles";

// JSON round-trip turns ObjectIds/Dates into strings, the same shape
// the profile has after being read back from Redis.
const toPlain = <T>(value: unknown) => JSON.parse(JSON.stringify(value)) as T;

const loadProfileFromDb = async (userId: string) => {
  const user = await UserModel.findById(userId)
    .populate([
      { path: "role", select: ROLE_FIELDS, model: RoleModel },
      { path: "hospitals.hospital", select: "name", model: HospitalModel },
    ])
    .lean();

  return user ? toPlain<SessionProfile>(user) : null;
};

const resolveToken = (type: TokenType, token: string | null) =>
  token ? verifyToken(type, token) : null;

// ---------- Sessions ----------

/** Issues a new auth + refresh token pair and caches the user's profile. */
export const createSession = async (userId: string) => {
  const profile = await loadProfileFromDb(userId);
  if (!profile) return null;

  const authToken = randomUUID();
  const refreshToken = randomUUID();

  await redis
    .multi()
    .set(
      keys.authToken(authToken),
      signToken("access", userId),
      expiresIn(env.ACCESS_TOKEN_TTL),
    )
    .set(
      keys.refreshToken(refreshToken),
      signToken("refresh", userId),
      expiresIn(env.REFRESH_TOKEN_TTL),
    )
    .set(
      keys.profile(userId),
      JSON.stringify(profile),
      expiresIn(env.REFRESH_TOKEN_TTL),
    )
    .exec();

  return {
    authToken,
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
    user: profile,
  };
};

/** Returns the userId behind an auth token, or null. */
export const resolveAuthToken = async (tokenId: string) =>
  resolveToken("access", await redis.get(keys.authToken(tokenId)));

/** Returns the userId and deletes the token in one step, so it works only once. */
export const consumeRefreshToken = async (tokenId: string) =>
  resolveToken("refresh", await redis.getDel(keys.refreshToken(tokenId)));

export const revokeTokens = async (tokens: {
  authToken?: string;
  refreshToken?: string;
}) => {
  const toDelete = [
    tokens.authToken && keys.authToken(tokens.authToken),
    tokens.refreshToken && keys.refreshToken(tokens.refreshToken),
  ].filter((key): key is string => Boolean(key));

  if (toDelete.length) await redis.del(toDelete);
};

export const getSessionProfile = async (
  userId: string,
): Promise<SessionProfile | null> => {
  const cached = await redis.get(keys.profile(userId));
  if (!cached) {
    const profile = await loadProfileFromDb(userId);
    if (!profile) return null;

    await redis.set(
      keys.profile(userId),
      JSON.stringify(profile),
      expiresIn(env.REFRESH_TOKEN_TTL),
    );
    return profile;
  }

  const profile = JSON.parse(cached) as SessionProfile;

  const role = await RoleModel.findById(profile.role._id)
    .select(ROLE_FIELDS)
    .lean();
  if (!role) return null;

  const freshRole = toPlain<SessionRole>(role);
  return { ...profile, userType: freshRole.userType, role: freshRole };
};

export const syncSessionProfile = async (userId: string) => {
  const key = keys.profile(userId);

  try {
    if (!(await redis.exists(key))) return;

    const profile = await loadProfileFromDb(userId);
    if (!profile) {
      await redis.del(key);
      return;
    }

    await redis.set(key, JSON.stringify(profile), { expiration: "KEEPTTL" });
  } catch (error) {
    console.error(`[session] failed to sync profile ${userId}`, error);
    await clearSessionProfile(userId);
  }
};

export const clearSessionProfile = async (userId: string) => {
  try {
    await redis.del(keys.profile(userId));
  } catch (error) {
    console.error(`[session] failed to clear profile ${userId}`, error);
  }
};
