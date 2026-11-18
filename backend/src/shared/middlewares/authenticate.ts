import type { RequestHandler } from "express";
import {
  getSessionProfile,
  resolveAuthToken,
  type SessionProfile,
} from "../../modules/auth/session";
import { serviceUnavailable, unauthorized } from "../utils/response";

declare global {
  namespace Express {
    interface Request {
      /** The logged-in user's profile (with fresh role and permissions). */
      user?: SessionProfile;
      /** The auth token uuid used for this request (for logout). */
      authTokenId?: string;
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Requires "Authorization: Bearer <authToken uuid>". */
export const authenticate: RequestHandler = async (req, res, next) => {
  const reject = (message: string) => {
    const result = unauthorized(message);
    res.status(result.status).json(result);
  };

  const [scheme, tokenId] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !tokenId) return reject("Authentication required");
  if (!UUID.test(tokenId)) return reject("Invalid or expired token");

  let profile: SessionProfile | null;
  try {
    const userId = await resolveAuthToken(tokenId);
    if (!userId) return reject("Invalid or expired token");

    profile = await getSessionProfile(userId);
  } catch (error) {
    console.error("[authenticate] session lookup failed", error);
    const result = serviceUnavailable("Authentication service unavailable");
    res.status(result.status).json(result);
    return;
  }

  if (!profile) return reject("Session expired, please log in again");
  if (!profile.isActive) return reject("Account is disabled");

  req.user = profile;
  req.authTokenId = tokenId;
  next();
};
