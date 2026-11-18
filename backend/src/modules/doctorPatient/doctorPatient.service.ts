import type { UserType } from "../../shared/constants/userTypes";
import { ageFromDateOfBirth } from "../../shared/utils/age";
import { isDuplicateKeyError, toObjectId } from "../../shared/utils/mongo";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import { buildDateRangeFilter, escapeRegex } from "../../shared/utils/query";
import {
  badRequest,
  conflict,
  created,
  forbidden,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { doctorScopeOf } from "../../shared/utils/viewer";
import type { SessionProfile } from "../auth/session";
import * as consultationService from "../consultation/consultation.service";
import * as patientService from "../patient/patient.service";
import { UserModel } from "../user/user.model";
import { DoctorPatientModel } from "./doctorPatient.model";
import type {
  AddDoctorPatientInput,
  DoctorPatientConsultationsQuery,
  ListDoctorPatientsQuery,
} from "./doctorPatient.validation";

const PATIENT_LIST_FIELDS = {
  name: 1,
  phone: 1,
  email: 1,
  gender: 1,
  dateOfBirth: 1,
  bloodGroup: 1,
  patientProfile: 1,
};

/**
 * Turns ":doctorId" ("me" or an id) into a real doctor id.
 * Doctors may only use their own id; admins may use any doctor's.
 */
const resolveDoctor = async (doctorParam: string, viewer: SessionProfile) => {
  const ownId = doctorScopeOf(viewer);

  if (doctorParam === "me" && !ownId) {
    return { error: forbidden("Only doctors have their own patient list") };
  }
  const doctorId = doctorParam === "me" ? ownId! : doctorParam;
  if (ownId && doctorId !== ownId) {
    return { error: forbidden("You can only access your own patients") };
  }

  const isDoctor = await UserModel.exists({
    _id: doctorId,
    userType: "DOCTOR" satisfies UserType,
  });
  if (!isDoctor) return { error: notFound("Doctor not found") };

  return { doctorId };
};

// ---------- Services ----------

export const getDoctorPatients = async (
  doctorParam: string,
  query: ListDoctorPatientsQuery,
  viewer: SessionProfile,
) => {
  try {
    const { doctorId, error } = await resolveDoctor(doctorParam, viewer);
    if (error) return error;

    const search = query.search
      ? new RegExp(escapeRegex(query.search), "i")
      : null;

    // One query: filter the list (indexed), join patient details, then
    // $facet returns the page and the total count together.
    const [result] = await DoctorPatientModel.aggregate<{
      items: Record<string, unknown>[];
      total: { count: number }[];
    }>([
      {
        $match: {
          doctor: toObjectId(doctorId),
          status: query.status,
          ...(query.condition && { lastCondition: query.condition }),
          ...buildDateRangeFilter(
            "lastVisitAt",
            query.lastVisitFrom,
            query.lastVisitTo,
          ),
        },
      },
      { $sort: { lastVisitAt: -1, createdAt: -1 } },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: "patient",
          foreignField: "_id",
          as: "patient",
          pipeline: [{ $project: PATIENT_LIST_FIELDS }],
        },
      },
      { $unwind: "$patient" },
      ...(search
        ? [{ $match: { $or: [{ "patient.name": search }, { "patient.phone": search }] } }]
        : []),
      {
        $facet: {
          items: [{ $skip: getSkip(query) }, { $limit: query.limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const items = (result?.items ?? []).map((item) => {
      const patient = item.patient as { dateOfBirth?: Date | null };
      return {
        ...item,
        patient: { ...patient, age: ageFromDateOfBirth(patient.dateOfBirth) },
      };
    });

    return paginated(
      "Doctor's patients fetched",
      items,
      buildPaginationMeta(query, result?.total[0]?.count ?? 0),
    );
  } catch (error) {
    return serverError("Failed to fetch doctor's patients", error);
  }
};

/** Admin adds a patient to a doctor's list. No visit yet: stats stay empty. */
export const addPatientToDoctor = async (
  doctorParam: string,
  input: AddDoctorPatientInput,
  viewer: SessionProfile,
) => {
  try {
    const { doctorId, error } = await resolveDoctor(doctorParam, viewer);
    if (error) return error;

    let patientId = input.patientId ?? null;

    if (patientId) {
      const isPatient = await UserModel.exists({
        _id: patientId,
        userType: "PATIENT" satisfies UserType,
      });
      if (!isPatient) {
        return badRequest("Invalid patient", { patientId: "Patient not found" });
      }

      const existing = await DoctorPatientModel.findOne({
        doctor: doctorId,
        patient: patientId,
      }).lean();
      if (existing?.status === "ACTIVE") {
        return conflict("Patient is already in this doctor's list", {
          patientId: "Already in this doctor's list",
        });
      }
    } else {
      const createdPatient = await patientService.createPatient(input.patient!);
      if (!createdPatient.success || !createdPatient.data) return createdPatient;
      patientId = createdPatient.data._id.toString();
    }

    // Re-adding a removed patient reactivates the entry and keeps its stats.
    const link = await DoctorPatientModel.findOneAndUpdate(
      { doctor: doctorId, patient: patientId },
      {
        $set: { status: "ACTIVE", removedAt: null },
        $setOnInsert: { addedBy: viewer._id },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    return created("Patient added to doctor's list", link);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return conflict("Patient is already in this doctor's list");
    }
    return serverError("Failed to add patient to doctor's list", error);
  }
};

/** Hides the patient from the list. Consultations are kept. */
export const removePatientFromDoctor = async (
  doctorParam: string,
  patientId: string,
  viewer: SessionProfile,
) => {
  try {
    const { doctorId, error } = await resolveDoctor(doctorParam, viewer);
    if (error) return error;

    const link = await DoctorPatientModel.findOneAndUpdate(
      { doctor: doctorId, patient: patientId, status: "ACTIVE" },
      { status: "REMOVED", removedAt: new Date() },
      { returnDocument: "after" },
    ).lean();
    if (!link) return notFound("Patient is not in this doctor's list");

    return success("Patient removed from doctor's list", link);
  } catch (error) {
    return serverError("Failed to remove patient from doctor's list", error);
  }
};

export const getDoctorPatientConsultations = async (
  doctorParam: string,
  patientId: string,
  query: DoctorPatientConsultationsQuery,
  viewer: SessionProfile,
) => {
  try {
    const { doctorId, error } = await resolveDoctor(doctorParam, viewer);
    if (error) return error;

    return await consultationService.getConsultations(
      { ...query, doctor: doctorId, patient: patientId },
      viewer,
    );
  } catch (error) {
    return serverError("Failed to fetch consultations", error);
  }
};
