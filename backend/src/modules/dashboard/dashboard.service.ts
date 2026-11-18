import type { Condition } from "../../shared/constants/medical";
import type { UserType } from "../../shared/constants/userTypes";
import { getOrSetCache } from "../../shared/utils/cache";
import { toObjectId } from "../../shared/utils/mongo";
import { forbidden, serverError, success } from "../../shared/utils/response";
import { doctorScopeOf } from "../../shared/utils/viewer";
import type { SessionProfile } from "../auth/session";
import { ConsultationModel } from "../consultation/consultation.model";
import { DoctorPatientModel } from "../doctorPatient/doctorPatient.model";
import { MedicineModel } from "../medicine/medicine.model";
import { UserModel } from "../user/user.model";
import type { DashboardQuery, Interval } from "./dashboard.validation";

const CACHE_TTL_SECONDS = 60;
const DAY_MS = 86_400_000;
const PATIENT = "PATIENT" satisfies UserType;
const DOCTOR = "DOCTOR" satisfies UserType;

type Range = { from: Date; to: Date; interval: Interval; timezone: string };

// ---------- Range & time buckets ----------

/** Defaults: last 30 days. `to` is rounded up to 5 minutes so the cache key is stable. */
const resolveRange = (query: DashboardQuery): Range => {
  const fiveMinutes = 5 * 60_000;
  const to = query.to ?? new Date(Math.ceil(Date.now() / fiveMinutes) * fiveMinutes);
  const from = query.from ?? new Date(to.getTime() - 30 * DAY_MS);
  const days = (to.getTime() - from.getTime()) / DAY_MS;
  const interval = query.interval ?? (days <= 62 ? "day" : days <= 180 ? "week" : "month");
  return { from, to, interval, timezone: query.timezone };
};

/** MongoDB expression: the bucket label of a date ("2026-11-18", week's Monday, or "2026-11"). */
const bucketExpression = (field: string, { interval, timezone }: Range) =>
  interval === "month"
    ? { $dateToString: { date: field, format: "%Y-%m", timezone } }
    : {
        $dateToString: {
          date:
            interval === "week"
              ? { $dateTrunc: { date: field, unit: "week", startOfWeek: "monday", timezone } }
              : field,
          format: "%Y-%m-%d",
          timezone,
        },
      };

/** The same labels in JS, for every bucket in the range, so empty days show as 0. */
const bucketLabels = ({ from, to, interval, timezone }: Range) => {
  const toDay = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  const labels = new Set<string>();

  // Step by 12h (not 24h) so daylight-saving shifts never skip a date.
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS / 2) {
    labels.add(toLabel(toDay.format(new Date(t)), interval));
  }
  labels.add(toLabel(toDay.format(to), interval));
  return [...labels];
};

const toLabel = (day: string, interval: Interval) => {
  if (interval === "day") return day;
  if (interval === "month") return day.slice(0, 7);

  const date = new Date(`${day}T00:00:00Z`);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
};

// ---------- Aggregations ----------

type ConsultationFacets = {
  summary: { total: number; firstVisits: number }[];
  uniquePatients: { count: number }[];
  trend: { _id: string; consultations: number; firstVisits: number }[];
  conditions: { _id: Condition; count: number }[];
  topMedicines: { name: string; count: number }[];
  byDoctor: { _id: unknown; consultations: number }[];
};

/** One pass over the period's consultations, split into all the views. */
const aggregateConsultations = async (range: Range, doctorId: string | null) => {
  const [result] = await ConsultationModel.aggregate<ConsultationFacets>([
    {
      $match: {
        visitedAt: { $gte: range.from, $lte: range.to },
        ...(doctorId && { doctor: toObjectId(doctorId) }),
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              firstVisits: { $sum: { $cond: [{ $eq: ["$visitType", "FIRST"] }, 1, 0] } },
            },
          },
        ],
        uniquePatients: [{ $group: { _id: "$patient" } }, { $count: "count" }],
        trend: [
          {
            $group: {
              _id: bucketExpression("$visitedAt", range),
              consultations: { $sum: 1 },
              firstVisits: { $sum: { $cond: [{ $eq: ["$visitType", "FIRST"] }, 1, 0] } },
            },
          },
        ],
        conditions: [{ $group: { _id: "$condition", count: { $sum: 1 } } }],
        topMedicines: [
          { $unwind: "$medicines" },
          // Rank by generic: hundreds of brands share one generic.
          { $set: { item: { $ifNull: ["$medicines.genericName", "$medicines.name"] } } },
          {
            $group: {
              _id: { $toLower: "$item" },
              name: { $first: "$item" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, name: 1 } },
          { $limit: 8 },
          { $project: { _id: 0, name: 1, count: 1 } },
        ],
        byDoctor: [{ $group: { _id: "$doctor", consultations: { $sum: 1 } } }],
      },
    },
  ]);
  return result;
};

/** New patients per bucket: registrations (admin) or first visits (doctor). */
const aggregateNewPatients = async (range: Range, doctorId: string | null) => {
  if (doctorId) return null; // a doctor's "new patients" are their first visits

  const rows = await UserModel.aggregate<{ _id: string; count: number }>([
    { $match: { userType: PATIENT, createdAt: { $gte: range.from, $lte: range.to } } },
    { $group: { _id: bucketExpression("$createdAt", range), count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
};

/** Patients' latest condition (admin: everyone, doctor: their active list). */
const aggregateCurrentConditions = (doctorId: string | null) =>
  doctorId
    ? DoctorPatientModel.aggregate<{ _id: Condition | null; count: number }>([
        { $match: { doctor: toObjectId(doctorId), status: "ACTIVE" } },
        { $group: { _id: "$lastCondition", count: { $sum: 1 } } },
      ])
    : UserModel.aggregate<{ _id: Condition | null; count: number }>([
        { $match: { userType: PATIENT } },
        { $group: { _id: "$patientProfile.currentCondition", count: { $sum: 1 } } },
      ]);

/** Top doctors by active patients, with their consultations in the period. */
const aggregatePatientsPerDoctor = async (consultationsByDoctor: Map<string, number>) => {
  const rows = await DoctorPatientModel.aggregate<{
    _id: unknown;
    patients: number;
    doctor: { name: string; doctorProfile?: { specialization?: string | null } };
  }>([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: "$doctor", patients: { $sum: 1 } } },
    { $sort: { patients: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "doctor",
        pipeline: [{ $project: { name: 1, "doctorProfile.specialization": 1 } }],
      },
    },
    { $unwind: "$doctor" },
  ]);

  return rows.map((row) => ({
    doctorId: String(row._id),
    name: row.doctor.name,
    specialization: row.doctor.doctorProfile?.specialization ?? null,
    patients: row.patients,
    consultations: consultationsByDoctor.get(String(row._id)) ?? 0,
  }));
};

const countTotals = async (doctorId: string | null) => {
  if (doctorId) {
    const [patients, consultations] = await Promise.all([
      DoctorPatientModel.countDocuments({ doctor: doctorId, status: "ACTIVE" }),
      ConsultationModel.countDocuments({ doctor: doctorId }),
    ]);
    return { doctors: null, patients, consultations, medicines: null };
  }

  const [doctors, patients, consultations, medicines] = await Promise.all([
    UserModel.countDocuments({ userType: DOCTOR }),
    UserModel.countDocuments({ userType: PATIENT }),
    ConsultationModel.estimatedDocumentCount(),
    MedicineModel.countDocuments({ isActive: true }),
  ]);
  return { doctors, patients, consultations, medicines };
};

// ---------- Service ----------

const buildDashboard = async (range: Range, doctorId: string | null) => {
  const [totals, consultations, newPatients, currentConditions] = await Promise.all([
    countTotals(doctorId),
    aggregateConsultations(range, doctorId),
    aggregateNewPatients(range, doctorId),
    aggregateCurrentConditions(doctorId),
  ]);

  const byDoctor = new Map(consultations.byDoctor.map((d) => [String(d._id), d.consultations]));
  const trendByBucket = new Map(consultations.trend.map((t) => [t._id, t]));
  const summary = consultations.summary[0] ?? { total: 0, firstVisits: 0 };

  const trend = bucketLabels(range).map((label) => {
    const bucket = trendByBucket.get(label);
    const firstVisits = bucket?.firstVisits ?? 0;
    return {
      period: label,
      consultations: bucket?.consultations ?? 0,
      firstVisits,
      followUps: (bucket?.consultations ?? 0) - firstVisits,
      newPatients: newPatients ? (newPatients.get(label) ?? 0) : firstVisits,
    };
  });

  return {
    range: { ...range, from: range.from.toISOString(), to: range.to.toISOString() },
    scope: doctorId ? "doctor" : "clinic",
    totals,
    period: {
      consultations: summary.total,
      firstVisits: summary.firstVisits,
      followUps: summary.total - summary.firstVisits,
      patientsSeen: consultations.uniquePatients[0]?.count ?? 0,
      newPatients: trend.reduce((sum, t) => sum + t.newPatients, 0),
    },
    trend,
    conditions: consultations.conditions.map((c) => ({ condition: c._id, count: c.count })),
    currentConditions: currentConditions.map((c) => ({ condition: c._id, count: c.count })),
    topMedicines: consultations.topMedicines,
    patientsPerDoctor: doctorId ? null : await aggregatePatientsPerDoctor(byDoctor),
  };
};

/**
 * Clinic-wide numbers for admins, a doctor's own numbers for doctors.
 * Cached briefly in Redis: dashboards are read far more than data changes.
 */
export const getDashboard = async (query: DashboardQuery, viewer: SessionProfile) => {
  if (viewer.userType === PATIENT) return forbidden("Dashboard is not available for patients");

  try {
    const range = resolveRange(query);
    const doctorId = doctorScopeOf(viewer);
    const cacheKey = [
      "dashboard",
      doctorId ?? "clinic",
      range.from.toISOString(),
      range.to.toISOString(),
      range.interval,
      range.timezone,
    ].join(":");

    const dashboard = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, () =>
      buildDashboard(range, doctorId),
    );
    return success("Dashboard fetched", dashboard);
  } catch (error) {
    return serverError("Failed to load dashboard", error);
  }
};
