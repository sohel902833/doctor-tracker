import type { Types } from "mongoose";
import type { UserType } from "../../shared/constants/userTypes";
import {
  ageFromDateOfBirth,
  dateOfBirthFromAge,
} from "../../shared/utils/age";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import {
  buildDateRangeFilter,
  buildSearchFilter,
} from "../../shared/utils/query";
import {
  badRequest,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { doctorScopeOf } from "../../shared/utils/viewer";
import type { SessionProfile } from "../auth/session";
import { DoctorPatientModel } from "../doctorPatient/doctorPatient.model";
import { RoleModel } from "../role/role.model";
import { UserModel } from "../user/user.model";
import * as userService from "../user/user.service";
import type {
  ListPatientsQuery,
  NewPatientInput,
  UpdatePatientInput,
} from "./patient.validation";

const PATIENT = "PATIENT" satisfies UserType;

const PATIENT_FIELDS =
  "name phone email dateOfBirth gender bloodGroup patientProfile isActive createdAt updatedAt";

// ---------- Helpers ----------

/** age -> estimated dateOfBirth; everything else passes through. */
export const toPatientUserFields = <T extends { age?: number }>({
  age,
  ...fields
}: T) => ({
  ...fields,
  ...(age !== undefined && { dateOfBirth: dateOfBirthFromAge(age) }),
});

/** Patients created by staff get the oldest PATIENT role. */
const findPatientRoleId = async () => {
  const role = await RoleModel.findOne({ userType: PATIENT })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();
  return role?._id.toString() ?? null;
};

const withAge = <T extends { dateOfBirth?: Date | null }>(patient: T) => ({
  ...patient,
  age: ageFromDateOfBirth(patient.dateOfBirth),
});

/** Active doctors of each patient, in one query for the whole page. */
const findDoctorsByPatient = async (patientIds: Types.ObjectId[]) => {
  const links = await DoctorPatientModel.find({
    patient: { $in: patientIds },
    status: "ACTIVE",
  })
    .select("doctor patient visitCount lastVisitAt")
    .populate<{
      doctor: { _id: unknown; name: string; doctorProfile?: unknown } | null;
    }>({ path: "doctor", select: "name doctorProfile.specialization", model: UserModel })
    .lean();

  const byPatient = new Map<string, unknown[]>();
  for (const link of links) {
    if (!link.doctor) continue;
    const key = String(link.patient);
    byPatient.set(key, [
      ...(byPatient.get(key) ?? []),
      { ...link.doctor, visitCount: link.visitCount, lastVisitAt: link.lastVisitAt },
    ]);
  }
  return byPatient;
};

/** A doctor may only see patients on their own list. */
const isOnDoctorsList = async (doctorId: string, patientId: string) =>
  Boolean(
    await DoctorPatientModel.exists({
      doctor: doctorId,
      patient: patientId,
      status: "ACTIVE",
    }),
  );

const findPatient = (id: string) =>
  UserModel.findOne({ _id: id, userType: PATIENT })
    .select(PATIENT_FIELDS)
    .lean();

// ---------- Services ----------

export const createPatient = async (input: NewPatientInput) => {
  try {
    const roleId = await findPatientRoleId();
    if (!roleId) return serverError("No patient role is configured");

    return await userService.createUser({
      ...toPatientUserFields(input),
      role: roleId,
    });
  } catch (error) {
    return serverError("Failed to create patient", error);
  }
};

export const getPatients = async (
  query: ListPatientsQuery,
  viewer: SessionProfile,
) => {
  try {
    const doctorId = doctorScopeOf(viewer) ?? query.doctor;
    const patientIds = doctorId
      ? await DoctorPatientModel.distinct("patient", {
          doctor: doctorId,
          status: "ACTIVE",
        })
      : null;

    const filter = {
      userType: PATIENT,
      ...(patientIds && { _id: { $in: patientIds } }),
      ...buildSearchFilter(query.search, ["name", "phone", "email"]),
      ...buildDateRangeFilter("createdAt", query.createdFrom, query.createdTo),
      ...(query.condition && {
        "patientProfile.currentCondition": query.condition,
      }),
      ...(query.gender && { gender: query.gender }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [patients, total] = await Promise.all([
      UserModel.find(filter)
        .select(PATIENT_FIELDS)
        .sort({ [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const doctorsByPatient = await findDoctorsByPatient(
      patients.map((patient) => patient._id),
    );
    const items = patients.map((patient) => ({
      ...withAge(patient),
      doctors: doctorsByPatient.get(String(patient._id)) ?? [],
    }));

    return paginated("Patients fetched", items, buildPaginationMeta(query, total));
  } catch (error) {
    return serverError("Failed to fetch patients", error);
  }
};

export const getPatientById = async (id: string, viewer: SessionProfile) => {
  try {
    const doctorId = doctorScopeOf(viewer);
    if (doctorId && !(await isOnDoctorsList(doctorId, id))) {
      return notFound("Patient not found");
    }

    const patient = await findPatient(id);
    if (!patient) return notFound("Patient not found");

    const doctorsByPatient = await findDoctorsByPatient([patient._id]);
    return success("Patient fetched", {
      ...withAge(patient),
      doctors: doctorsByPatient.get(String(patient._id)) ?? [],
    });
  } catch (error) {
    return serverError("Failed to fetch patient", error);
  }
};

/**
 * Finds a patient by phone for the consultation / add-patient forms.
 * Returns { patient: null } when there is none (the form then creates one).
 * For a doctor it also returns their visit stats with this patient.
 */
export const lookupPatientByPhone = async (
  phone: string,
  viewer: SessionProfile,
) => {
  try {
    const user = await UserModel.findOne({ phone })
      .select(`${PATIENT_FIELDS} userType`)
      .lean();

    if (!user) {
      return success("No patient with this phone", {
        patient: null,
        relation: null,
      });
    }
    if (user.userType !== PATIENT) {
      return badRequest("Phone belongs to a non-patient user", {
        phone: "This phone is used by a staff account",
      });
    }

    const doctorId = doctorScopeOf(viewer);
    const relation = doctorId
      ? await DoctorPatientModel.findOne({ doctor: doctorId, patient: user._id })
          .select("status visitCount firstVisitAt lastVisitAt lastCondition")
          .lean()
      : null;

    const { userType: _userType, ...patient } = user;
    return success("Patient found", { patient: withAge(patient), relation });
  } catch (error) {
    return serverError("Failed to look up patient", error);
  }
};

export const updatePatient = async (
  id: string,
  { condition, ...input }: UpdatePatientInput,
  viewer: SessionProfile,
) => {
  try {
    const doctorId = doctorScopeOf(viewer);
    if (doctorId && !(await isOnDoctorsList(doctorId, id))) {
      return notFound("Patient not found");
    }
    if (!(await UserModel.exists({ _id: id, userType: PATIENT }))) {
      return notFound("Patient not found");
    }

    const result = await userService.updateUser(id, toPatientUserFields(input));
    if (!result.success) return result;

    if (condition !== undefined) {
      await UserModel.updateOne(
        { _id: id },
        { patientProfile: { currentCondition: condition } },
      );
    }

    return getPatientById(id, viewer);
  } catch (error) {
    return serverError("Failed to update patient", error);
  }
};

export const deletePatient = async (id: string) => {
  try {
    if (!(await UserModel.exists({ _id: id, userType: PATIENT }))) {
      return notFound("Patient not found");
    }

    // Removes the user and their list entries; consultations are kept.
    return await userService.deleteUser(id);
  } catch (error) {
    return serverError("Failed to delete patient", error);
  }
};
