import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export type AccessTokenPayload = { sub: string };

export const signAccessToken = (userId: string) =>
  jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

/** Returns the payload, or null if the token is invalid or expired. */
export const verifyAccessToken = (token: string) => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub) return null;

    return { sub: payload.sub } as AccessTokenPayload;
  } catch {
    return null;
  }
};
