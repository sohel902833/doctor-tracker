import bcrypt from "bcryptjs";
import type { UserType } from "../../shared/constants/userTypes";
import {
  forbidden,
  serverError,
  success,
  unauthorized,
} from "../../shared/utils/response";
import { RoleModel } from "../role/role.model";
import { UserModel } from "../user/user.model";
import * as userService from "../user/user.service";
import type { LoginInput, LogoutInput, RegisterInput } from "./auth.validation";
import {
  consumeRefreshToken,
  createSession,
  revokeTokens,
  type SessionProfile,
} from "./session";

// Compared against when the email is unknown, so a missing user takes
// as long as a wrong password (prevents guessing emails by timing).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

export const login = async ({ email, password }: LoginInput) => {
  try {
    const user = await UserModel.findOne({ email })
      .select("+password isActive")
      .lean();

    const passwordMatches = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_HASH,
    );
    if (!user || !passwordMatches) {
      return unauthorized("Invalid email or password");
    }

    if (!user.isActive) return forbidden("Your account is disabled");

    const session = await createSession(user._id.toString());
    if (!session) return unauthorized("Invalid email or password");

    return success("Login successful", session);
  } catch (error) {
    return serverError("Failed to log in", error);
  }
};

/**
 * Self sign-up as a patient. Uses the oldest PATIENT role.
 * Disabled unless ENABLE_REGISTRATION=true (checked in auth.routes).
 */
export const register = async (input: RegisterInput) => {
  try {
    const patientRole = await RoleModel.findOne({
      userType: "PATIENT" satisfies UserType,
    })
      .sort({ createdAt: 1 })
      .select("_id")
      .lean();
    if (!patientRole) {
      return serverError("Registration is not configured: no patient role");
    }

    const result = await userService.createUser({
      ...input,
      role: patientRole._id.toString(),
    });
    if (!result.success || !result.data) return result;

    const session = await createSession(result.data._id.toString());
    if (!session) return serverError("Failed to start session");

    return { ...result, message: "Registration successful", data: session };
  } catch (error) {
    return serverError("Failed to register", error);
  }
};

/** Swaps a refresh token for a new token pair. Each refresh token works once. */
export const refresh = async (refreshToken: string) => {
  try {
    const userId = await consumeRefreshToken(refreshToken);
    if (!userId) return unauthorized("Invalid or expired refresh token");

    const user = await UserModel.findById(userId).select("isActive").lean();
    if (!user) return unauthorized("User no longer exists");
    if (!user.isActive) return forbidden("Your account is disabled");

    const session = await createSession(userId);
    if (!session) return unauthorized("User no longer exists");

    return success("Token refreshed", session);
  } catch (error) {
    return serverError("Failed to refresh token", error);
  }
};

export const logout = async (authToken: string, { refreshToken }: LogoutInput) => {
  try {
    await revokeTokens({ authToken, refreshToken });
    return success("Logged out");
  } catch (error) {
    return serverError("Failed to log out", error);
  }
};

/** `authenticate` already loaded the cached profile with fresh permissions. */
export const getProfile = (profile: SessionProfile) =>
  success("Profile fetched", profile);
