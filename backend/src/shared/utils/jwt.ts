import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export type TokenType = "access" | "refresh";

const tokenConfig = {
  access: { secret: env.JWT_ACCESS_SECRET, ttl: env.ACCESS_TOKEN_TTL },
  refresh: { secret: env.JWT_REFRESH_SECRET, ttl: env.REFRESH_TOKEN_TTL },
} as const;

export const signToken = (type: TokenType, userId: string) =>
  jwt.sign({ sub: userId, type }, tokenConfig[type].secret, {
    expiresIn: tokenConfig[type].ttl,
  });

/** Returns the userId, or null if the token is invalid, expired or the wrong type. */
export const verifyToken = (type: TokenType, token: string) => {
  try {
    const payload = jwt.verify(token, tokenConfig[type].secret);
    if (typeof payload === "string" || payload.type !== type) return null;

    return payload.sub ?? null;
  } catch {
    return null;
  }
};
