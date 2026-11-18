import type { Condition } from "../../shared/constants/medical";
import type { UserType } from "../../shared/constants/userTypes";
import { nextSequence } from "../../shared/models/counter.model";
import { ageFromDateOfBirth } from "../../shared/utils/age";
import { toObjectId } from "../../shared/utils/mongo";
import { buildPaginationMeta, getSkip } from "../../shared/utils/pagination";
import {
  buildDateRangeFilter,
  buildSearchFilter,
} from "../../shared/utils/query";
import {
  badRequest,
  created,
  forbidden,
  notFound,
  paginated,
  serverError,
  success,
} from "../../shared/utils/response";
import { doctorScopeOf } from "../../shared/utils/viewer";
import type { SessionProfile } from "../auth/session";
import { DoctorPatientModel } from "../doctorPatient/doctorPatient.model";
import { HospitalModel } from "../hospital/hospital.model";
import { MedicineModel } from "../medicine/medicine.model";
import * as patientService from "../patient/patient.service";
import type { NewPatientInput } from "../patient/patient.validation";
import { UserModel } from "../user/user.model";
import * as userService from "../user/user.service";
import { ConsultationModel } from "./consultation.model";
import type {
  CreateConsultationInput,
  ListConsultationsQuery,
} from "./consultation.validation";

const PATIENT = "PATIENT" satisfies UserType;

// ---------- Helpers ----------

const nextPrescriptionNo = async (at: Date) => {
  const year = at.getUTCFullYear();
  const seq = await nextSequence(`prescription-${year}`);
  return `RX-${year}-${String(seq).padStart(6, "0")}`;
};

/** Catalog medicines win over client-sent name/strength/form/generic. */
const resolveMedicines = async (medicines: CreateConsultationInput["medicines"]) => {
  const ids = [
    ...new Set(medicines.flatMap((item) => (item.medicineId ? [item.medicineId] : []))),
  ];
  const catalog = ids.length
    ? await MedicineModel.find({ _id: { $in: ids } })
        .select("name strength dosageForm genericName")
        .lean()
    : [];
  if (catalog.length !== ids.length) return null;

  const byId = new Map(catalog.map((medicine) => [String(medicine._id), medicine]));
  return medicines.map(({ medicineId, ...item }) => {
    const fromCatalog = medicineId ? byId.get(medicineId) : undefined;
    return {
      ...item,
      medicine: medicineId ?? null,
      ...(fromCatalog && {
        name: fromCatalog.name,
        strength: fromCatalog.strength ?? null,
        dosageForm: fromCatalog.dosageForm,
        genericName: fromCatalog.genericName ?? null,
      }),
    };
  });
};

const buildDoctorSnapshot = async (doctorId: string) => {
  const doctor = await UserModel.findById(doctorId)
    .select("name doctorProfile hospitals")
    .populate<{ hospitals: { hospital: { name: string } | null; isCurrent: boolean }[] }>({
      path: "hospitals.hospital",
      select: "name",
      model: HospitalModel,
    })
    .lean();
  if (!doctor) return null;

  const currentHospital = doctor.hospitals.find((entry) => entry.isCurrent);
  return {
    name: doctor.name,
    specialization: doctor.doctorProfile?.specialization ?? null,
    qualifications: doctor.doctorProfile?.qualifications ?? null,
    registrationNo: doctor.doctorProfile?.registrationNo ?? null,
    designation: doctor.doctorProfile?.designation ?? null,
    hospital: currentHospital?.hospital?.name ?? null,
  };
};

/**
 * Records a visit on the doctor's list in ONE atomic update: creates the
 * entry if needed, bumps visitCount and sets first/last visit. Because it
 * is atomic, two saves at the same time still get different visit numbers.
 */
const recordVisit = (
  doctorId: string,
  patientId: string,
  condition: Condition,
  visitedAt: Date,
) =>
  DoctorPatientModel.findOneAndUpdate(
    { doctor: toObjectId(doctorId), patient: toObjectId(patientId) },
    [
      {
        $set: {
          status: "ACTIVE",
          removedAt: null,
          addedBy: { $ifNull: ["$addedBy", toObjectId(doctorId)] },
          visitCount: { $add: [{ $ifNull: ["$visitCount", 0] }, 1] },
          firstVisitAt: { $ifNull: ["$firstVisitAt", visitedAt] },
          lastVisitAt: visitedAt,
          lastCondition: condition,
          createdAt: { $ifNull: ["$createdAt", visitedAt] },
          updatedAt: visitedAt,
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
      timestamps: false,
    },
  ).lean();

/** Undo recordVisit (and a just-created patient) if the insert fails. */
const rollbackVisit = async (
  link: { _id: unknown; visitCount: number },
  createdPatientId: string | null,
) => {
  if (createdPatientId) {
    await Promise.all([
      UserModel.deleteOne({ _id: createdPatientId }),
      DoctorPatientModel.deleteOne({ _id: link._id }),
    ]);
    return;
  }

  await DoctorPatientModel.updateOne(
    { _id: link._id },
    link.visitCount <= 1
      ? { visitCount: 0, firstVisitAt: null, lastVisitAt: null, lastCondition: null }
      : { $inc: { visitCount: -1 } },
  );
};

// ---------- Services ----------

/**
 * A doctor sees a patient. Steps (no transaction, so ordered to fail safely):
 *   1. validate medicines        (nothing written yet)
 *   2. load / update / create the patient
 *   3. record the visit on the doctor's list (atomic -> visit number)
 *   4. insert the consultation   (rolled back from step 3 if this fails)
 *   5. copy the condition onto the patient
 */
export const createConsultation = async (
  input: CreateConsultationInput,
  viewer: SessionProfile,
) => {
  const doctorId = doctorScopeOf(viewer);
  if (!doctorId) return forbidden("Only doctors can create consultations");

  try {
    // 1. Medicines
    const medicines = await resolveMedicines(input.medicines);
    if (!medicines) {
      return badRequest("Invalid medicines", {
        medicines: "One or more medicines were not found",
      });
    }

    // 2. Patient
    let patientId = input.patientId ?? null;
    let createdPatientId: string | null = null;

    if (patientId) {
      if (!(await UserModel.exists({ _id: patientId, userType: PATIENT }))) {
        return badRequest("Invalid patient", { patientId: "Patient not found" });
      }
      if (input.patient && Object.keys(input.patient).length) {
        const updated = await userService.updateUser(
          patientId,
          patientService.toPatientUserFields(input.patient),
        );
        if (!updated.success) return updated;
      }
    } else {
      const createdPatient = await patientService.createPatient(
        input.patient as NewPatientInput,
      );
      if (!createdPatient.success || !createdPatient.data) return createdPatient;
      patientId = createdPatientId = createdPatient.data._id.toString();
    }

    const [patient, doctorSnapshot] = await Promise.all([
      UserModel.findById(patientId).select("name dateOfBirth gender phone").lean(),
      buildDoctorSnapshot(doctorId),
    ]);
    if (!patient || !doctorSnapshot) return notFound("Patient or doctor not found");

    // 3. Visit number
    const visitedAt = new Date();
    const link = await recordVisit(doctorId, patientId, input.condition, visitedAt);
    if (!link) return serverError("Failed to record the visit");

    // 4. Consultation
    let consultation;
    try {
      consultation = await ConsultationModel.create({
        prescriptionNo: await nextPrescriptionNo(visitedAt),
        doctor: doctorId,
        patient: patientId,
        visitNumber: link.visitCount,
        visitType: link.visitCount === 1 ? "FIRST" : "FOLLOW_UP",
        visitedAt,
        condition: input.condition,
        diagnosis: input.diagnosis ?? null,
        notes: input.notes ?? null,
        medicines,
        advice: input.advice,
        followUpDate: input.followUpDate ?? null,
        doctorSnapshot,
        patientSnapshot: {
          name: patient.name,
          age: ageFromDateOfBirth(patient.dateOfBirth, visitedAt),
          gender: patient.gender ?? null,
          phone: patient.phone ?? null,
        },
        createdBy: viewer._id,
      });
    } catch (error) {
      await rollbackVisit(link, createdPatientId);
      throw error;
    }

    // 5. Latest condition, for the patients page filter
    await UserModel.updateOne(
      { _id: patientId },
      { patientProfile: { currentCondition: input.condition } },
    );

    return created("Consultation saved", consultation);
  } catch (error) {
    return serverError("Failed to save consultation", error);
  }
};

export const getConsultations = async (
  query: ListConsultationsQuery,
  viewer: SessionProfile,
) => {
  try {
    const filter = {
      ...((doctorScopeOf(viewer) ?? query.doctor) && {
        doctor: doctorScopeOf(viewer) ?? query.doctor,
      }),
      ...(query.patient && { patient: query.patient }),
      ...(query.condition && { condition: query.condition }),
      ...buildDateRangeFilter("visitedAt", query.visitedFrom, query.visitedTo),
      ...buildSearchFilter(query.search, ["prescriptionNo", "patientSnapshot.name"]),
    };

    const [consultations, total] = await Promise.all([
      ConsultationModel.find(filter)
        .sort({ visitedAt: -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .lean(),
      ConsultationModel.countDocuments(filter),
    ]);

    return paginated(
      "Consultations fetched",
      consultations,
      buildPaginationMeta(query, total),
    );
  } catch (error) {
    return serverError("Failed to fetch consultations", error);
  }
};

export const getConsultationById = async (id: string, viewer: SessionProfile) => {
  try {
    const consultation = await ConsultationModel.findById(id).lean();
    const doctorId = doctorScopeOf(viewer);

    // A doctor asking for another doctor's consultation gets the same 404.
    if (!consultation || (doctorId && String(consultation.doctor) !== doctorId)) {
      return notFound("Consultation not found");
    }

    return success("Consultation fetched", consultation);
  } catch (error) {
    return serverError("Failed to fetch consultation", error);
  }
};
