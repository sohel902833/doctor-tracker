import bcrypt from "bcryptjs";
import type { UserType } from "../../shared/constants/userTypes";
import { signAccessToken } from "../../shared/utils/jwt";
import {
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../../shared/utils/response";
import { RoleModel } from "../role/role.model";
import { UserModel } from "../user/user.model";
import * as userService from "../user/user.service";
import type { LoginInput, RegisterInput } from "./auth.validation";

// Compared against when the email is unknown, so a missing user takes
// as long as a wrong password (prevents guessing emails by timing).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

const findProfile = (id: string) =>
  UserModel.findById(id)
    .populate([
      { path: "role", select: "name userType permissions subordinateRoles" },
      { path: "hospitals.hospital", select: "name" },
    ])
    .lean();

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

    const userId = user._id.toString();
    return success("Login successful", {
      token: signAccessToken(userId),
      user: await findProfile(userId),
    });
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

    const userId = result.data._id.toString();
    return {
      ...result,
      message: "Registration successful",
      data: { token: signAccessToken(userId), user: result.data },
    };
  } catch (error) {
    return serverError("Failed to register", error);
  }
};

export const getProfile = async (userId: string) => {
  try {
    const user = await findProfile(userId);
    if (!user) return notFound("User not found");

    return success("Profile fetched", user);
  } catch (error) {
    return serverError("Failed to fetch profile", error);
  }
};
