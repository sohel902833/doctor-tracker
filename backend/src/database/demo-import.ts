import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { ConsultationModel } from "../modules/consultation/consultation.model";
import { DoctorPatientModel } from "../modules/doctorPatient/doctorPatient.model";
import { HospitalModel } from "../modules/hospital/hospital.model";
import { MedicineModel } from "../modules/medicine/medicine.model";
import { RoleModel } from "../modules/role/role.model";
import { UserModel } from "../modules/user/user.model";
import type { Condition } from "../shared/constants/medical";
import { CounterModel } from "../shared/models/counter.model";
import { ageFromDateOfBirth } from "../shared/utils/age";

/**
 * Imports the demo data in backend/data/demo (made by `npm run demo:generate`).
 * Same pattern as the medicine catalog: load what exists in one query per
 * collection, find what's missing in memory, bulk-insert only that.
 *   hospitals by name · doctors by email · patients by phone
 *   consultations by sourceKey · doctor lists by doctor+patient
 */

const DEMO_DIR = path.resolve(__dirname, "../../data/demo");
const BATCH_SIZE = 1000;
const DAY_MS = 86_400_000;

type DemoHospital = { name: string; address: string; phone: string; email: string };
type DemoDoctor = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  doctorProfile: Record<string, string>;
  hospitals: { hospital: string; startDate: string; endDate: string | null; isCurrent: boolean; summary: string }[];
};
type DemoPatient = { name: string; phone: string; gender: string; dateOfBirth: string; bloodGroup: string | null };
type DemoConsultation = {
  sourceKey: string;
  doctorEmail: string;
  patientPhone: string;
  daysAgo: number;
  minuteOfDay: number;
  condition: Condition;
  diagnosis: string;
  notes: string | null;
  medicines: {
    medicineSourceId: number;
    dose: string;
    schedule: { morning: number; noon: number; night: number };
    mealTiming: string;
    durationDays: number;
    instructions: string | null;
  }[];
  advice: string[];
  followUpInDays: number | null;
};
type DemoAssignment = { doctorEmail: string; patientPhone: string };

export type DemoImportResult = Record<
  "hospitals" | "doctors" | "patients" | "consultations" | "doctorLists",
  number
>;

const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(DEMO_DIR, file), "utf8")) as T;

/** Demo records carry their own (backdated) createdAt, so timestamps are off. */
const insertInBatches = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: { insertMany: (docs: any[], options: any) => Promise<unknown> },
  docs: unknown[],
) => {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await model.insertMany(docs.slice(i, i + BATCH_SIZE), { ordered: false, timestamps: false });
  }
  return docs.length;
};

const pairKey = (doctor: string, patient: string) => `${doctor}:${patient}`;

/** "days ago" + minute of day -> a real date relative to today (never in the future). */
const toVisitDate = (daysAgo: number, minuteOfDay: number) => {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const date = new Date(startOfToday.getTime() - daysAgo * DAY_MS + minuteOfDay * 60_000);
  return date > new Date() ? new Date(Date.now() - 5 * 60_000) : date;
};

const findRoleId = async (userType: "DOCTOR" | "PATIENT") => {
  const role = await RoleModel.findOne({ userType }).sort({ createdAt: 1 }).select("_id").lean();
  if (!role) throw new Error(`No ${userType} role: run the role seed first`);
  return role._id;
};

// ---------- Steps ----------

const importHospitals = async (hospitals: DemoHospital[]) => {
  const existing = new Set(
    (await HospitalModel.find().select("name").lean()).map((h) => h.name.toLowerCase()),
  );
  const missing = hospitals.filter((h) => !existing.has(h.name.toLowerCase()));
  const addedAt = new Date(Date.now() - 500 * DAY_MS);
  await insertInBatches(
    HospitalModel,
    missing.map((h) => ({ ...h, createdAt: addedAt, updatedAt: addedAt })),
  );

  const all = await HospitalModel.find({ name: { $in: hospitals.map((h) => h.name) } })
    .select("name")
    .lean();
  return { added: missing.length, idByName: new Map(all.map((h) => [h.name, h._id])) };
};

const importDoctors = async (
  doctors: DemoDoctor[],
  hospitalIds: Map<string, Types.ObjectId>,
  password: string,
) => {
  const emails = doctors.map((d) => d.email);
  const existing = new Set(
    (await UserModel.find({ email: { $in: emails } }).select("email").lean()).map((u) => u.email),
  );
  const missing = doctors.filter((d) => !existing.has(d.email));

  if (missing.length) {
    const [roleId, passwordHash] = await Promise.all([findRoleId("DOCTOR"), bcrypt.hash(password, 10)]);
    await insertInBatches(
      UserModel,
      missing.map((d) => ({
        ...d,
        createdAt: new Date(Date.now() - 400 * DAY_MS),
        updatedAt: new Date(Date.now() - 400 * DAY_MS),
        password: passwordHash,
        role: roleId,
        userType: "DOCTOR",
        hospitals: d.hospitals.map((h) => ({ ...h, hospital: hospitalIds.get(h.hospital) })),
      })),
    );
  }

  const all = await UserModel.find({ email: { $in: emails } })
    .select("name email doctorProfile hospitals")
    .lean();
  const hospitalNames = new Map([...hospitalIds].map(([name, id]) => [String(id), name]));
  return {
    added: missing.length,
    byEmail: new Map(
      all.map((d) => [
        d.email!,
        {
          _id: d._id,
          snapshot: {
            name: d.name,
            specialization: d.doctorProfile?.specialization ?? null,
            qualifications: d.doctorProfile?.qualifications ?? null,
            registrationNo: d.doctorProfile?.registrationNo ?? null,
            designation: d.doctorProfile?.designation ?? null,
            hospital:
              hospitalNames.get(String(d.hospitals.find((h) => h.isCurrent)?.hospital)) ?? null,
          },
        },
      ]),
    ),
  };
};

const importPatients = async (patients: DemoPatient[], consultations: DemoConsultation[]) => {
  // Each patient's condition from their most recent demo visit, and their
  // registration date from the first one.
  const latest = new Map<string, DemoConsultation>();
  const first = new Map<string, DemoConsultation>();
  for (const c of consultations) {
    const current = latest.get(c.patientPhone);
    if (!current || c.daysAgo < current.daysAgo) latest.set(c.patientPhone, c);
    const earliest = first.get(c.patientPhone);
    if (!earliest || c.daysAgo > earliest.daysAgo) first.set(c.patientPhone, c);
  }
  const registeredAt = (phone: string) => {
    const visit = first.get(phone);
    return visit
      ? new Date(toVisitDate(visit.daysAgo, visit.minuteOfDay).getTime() - 60 * 60_000)
      : new Date(Date.now() - 30 * DAY_MS);
  };

  const phones = patients.map((p) => p.phone);
  const existing = new Set(
    (await UserModel.find({ phone: { $in: phones } }).select("phone").lean()).map((u) => u.phone),
  );
  const missing = patients.filter((p) => !existing.has(p.phone));

  if (missing.length) {
    const roleId = await findRoleId("PATIENT");
    await insertInBatches(
      UserModel,
      missing.map((p) => ({
        ...p,
        role: roleId,
        userType: "PATIENT",
        patientProfile: { currentCondition: latest.get(p.phone)?.condition ?? null },
        createdAt: registeredAt(p.phone),
        updatedAt: registeredAt(p.phone),
      })),
    );
  }

  const all = await UserModel.find({ phone: { $in: phones }, userType: "PATIENT" })
    .select("name phone gender dateOfBirth")
    .lean();
  return { added: missing.length, byPhone: new Map(all.map((p) => [p.phone!, p])) };
};

/** Reserves `count` prescription numbers for `year` in one atomic step. */
const reservePrescriptionNumbers = async (year: number, count: number) => {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: `prescription-${year}` },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const first = counter!.seq - count + 1;
  return (index: number) => `RX-${year}-${String(first + index).padStart(6, "0")}`;
};

const importConsultations = async (
  consultations: DemoConsultation[],
  doctors: Awaited<ReturnType<typeof importDoctors>>["byEmail"],
  patients: Awaited<ReturnType<typeof importPatients>>["byPhone"],
  adminId: Types.ObjectId,
) => {
  const existingKeys = new Set(
    (
      await ConsultationModel.find({ sourceKey: { $in: consultations.map((c) => c.sourceKey) } })
        .select("sourceKey")
        .lean()
    ).map((c) => c.sourceKey),
  );
  const missing = consultations
    .filter((c) => !existingKeys.has(c.sourceKey))
    .filter((c) => doctors.has(c.doctorEmail) && patients.has(c.patientPhone))
    .map((c) => ({ ...c, visitedAt: toVisitDate(c.daysAgo, c.minuteOfDay) }))
    .sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime());
  if (!missing.length) return 0;

  const medicines = await MedicineModel.find({
    sourceId: { $in: [...new Set(missing.flatMap((c) => c.medicines.map((m) => m.medicineSourceId)))] },
  })
    .select("sourceId name strength dosageForm genericName")
    .lean();
  const medicineBySource = new Map(medicines.map((m) => [m.sourceId, m]));

  // Visit numbers continue after any visits the pair already has.
  const existingCounts = await ConsultationModel.aggregate<{ _id: { d: unknown; p: unknown }; n: number }>([
    { $match: { doctor: { $in: [...doctors.values()].map((d) => d._id) } } },
    { $group: { _id: { d: "$doctor", p: "$patient" }, n: { $sum: 1 } } },
  ]);
  const visitsSoFar = new Map(existingCounts.map((c) => [pairKey(String(c._id.d), String(c._id.p)), c.n]));

  const byYear = new Map<number, number>();
  for (const c of missing) byYear.set(c.visitedAt.getUTCFullYear(), (byYear.get(c.visitedAt.getUTCFullYear()) ?? 0) + 1);
  const numberers = new Map(
    await Promise.all(
      [...byYear].map(async ([year, count]): Promise<[number, { next: (i: number) => string; used: number }]> => [
        year,
        { next: await reservePrescriptionNumbers(year, count), used: 0 },
      ]),
    ),
  );

  const docs = missing.map((c) => {
    const doctor = doctors.get(c.doctorEmail)!;
    const patient = patients.get(c.patientPhone)!;
    const key = pairKey(String(doctor._id), String(patient._id));
    const visitNumber = (visitsSoFar.get(key) ?? 0) + 1;
    visitsSoFar.set(key, visitNumber);

    const numberer = numberers.get(c.visitedAt.getUTCFullYear())!;
    return {
      sourceKey: c.sourceKey,
      prescriptionNo: numberer.next(numberer.used++),
      doctor: doctor._id,
      patient: patient._id,
      visitNumber,
      visitType: visitNumber === 1 ? "FIRST" : "FOLLOW_UP",
      visitedAt: c.visitedAt,
      condition: c.condition,
      diagnosis: c.diagnosis,
      notes: c.notes,
      medicines: c.medicines.flatMap((m) => {
        const medicine = medicineBySource.get(m.medicineSourceId);
        if (!medicine) return [];
        const { medicineSourceId: _sourceId, ...prescription } = m;
        return [{
          ...prescription,
          medicine: medicine._id,
          name: medicine.name,
          strength: medicine.strength,
          dosageForm: medicine.dosageForm,
          genericName: medicine.genericName,
        }];
      }),
      advice: c.advice,
      followUpDate: c.followUpInDays ? new Date(c.visitedAt.getTime() + c.followUpInDays * DAY_MS) : null,
      doctorSnapshot: doctor.snapshot,
      patientSnapshot: {
        name: patient.name,
        age: ageFromDateOfBirth(patient.dateOfBirth, c.visitedAt),
        gender: patient.gender ?? null,
        phone: patient.phone ?? null,
      },
      createdBy: adminId,
      createdAt: c.visitedAt,
      updatedAt: c.visitedAt,
    };
  });

  // Timestamps come from visitedAt, so don't let Mongoose overwrite them.
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await ConsultationModel.insertMany(docs.slice(i, i + BATCH_SIZE), { ordered: false, timestamps: false } as never);
  }
  return docs.length;
};

/** Doctor lists: stats from all of the pair's consultations, plus list-only assignments. */
const importDoctorLists = async (
  assignments: DemoAssignment[],
  doctors: Awaited<ReturnType<typeof importDoctors>>["byEmail"],
  patients: Awaited<ReturnType<typeof importPatients>>["byPhone"],
  adminId: Types.ObjectId,
) => {
  const doctorIds = [...doctors.values()].map((d) => d._id);
  const [existingLinks, stats] = await Promise.all([
    DoctorPatientModel.find({ doctor: { $in: doctorIds } }).select("doctor patient").lean(),
    ConsultationModel.aggregate<{
      _id: { doctor: Types.ObjectId; patient: Types.ObjectId };
      visitCount: number;
      firstVisitAt: Date;
      lastVisitAt: Date;
      lastCondition: Condition;
    }>([
      { $match: { doctor: { $in: doctorIds } } },
      { $sort: { visitedAt: 1 } },
      {
        $group: {
          _id: { doctor: "$doctor", patient: "$patient" },
          visitCount: { $sum: 1 },
          firstVisitAt: { $first: "$visitedAt" },
          lastVisitAt: { $last: "$visitedAt" },
          lastCondition: { $last: "$condition" },
        },
      },
    ]),
  ]);
  const linked = new Set(existingLinks.map((l) => pairKey(String(l.doctor), String(l.patient))));

  const fromVisits = stats
    .filter((s) => !linked.has(pairKey(String(s._id.doctor), String(s._id.patient))))
    .map((s) => ({
      doctor: s._id.doctor,
      patient: s._id.patient,
      status: "ACTIVE",
      addedBy: s._id.doctor,
      visitCount: s.visitCount,
      firstVisitAt: s.firstVisitAt,
      lastVisitAt: s.lastVisitAt,
      lastCondition: s.lastCondition,
      createdAt: s.firstVisitAt,
      updatedAt: s.lastVisitAt,
    }));
  for (const link of fromVisits) linked.add(pairKey(String(link.doctor), String(link.patient)));

  const listOnly = assignments.flatMap((a) => {
    const doctor = doctors.get(a.doctorEmail);
    const patient = patients.get(a.patientPhone);
    if (!doctor || !patient || linked.has(pairKey(String(doctor._id), String(patient._id)))) return [];
    linked.add(pairKey(String(doctor._id), String(patient._id)));
    const addedAt = new Date(Date.now() - 20 * DAY_MS);
    return [{
      doctor: doctor._id,
      patient: patient._id,
      status: "ACTIVE",
      addedBy: adminId,
      createdAt: addedAt,
      updatedAt: addedAt,
    }];
  });

  return insertInBatches(DoctorPatientModel, [...fromVisits, ...listOnly]);
};

// ---------- Run ----------

export const importDemoData = async ({
  doctorPassword,
  adminId,
}: {
  doctorPassword: string;
  adminId: Types.ObjectId;
}): Promise<DemoImportResult> => {
  const [hospitals, doctors, patients, consultations, assignments] = await Promise.all([
    readJson<DemoHospital[]>("hospitals.json"),
    readJson<DemoDoctor[]>("doctors.json"),
    readJson<DemoPatient[]>("patients.json"),
    readJson<DemoConsultation[]>("consultations.json"),
    readJson<DemoAssignment[]>("assignments.json"),
  ]);

  const hospitalStep = await importHospitals(hospitals);
  const doctorStep = await importDoctors(doctors, hospitalStep.idByName, doctorPassword);
  const patientStep = await importPatients(patients, consultations);
  const consultationsAdded = await importConsultations(consultations, doctorStep.byEmail, patientStep.byPhone, adminId);
  const listsAdded = await importDoctorLists(assignments, doctorStep.byEmail, patientStep.byPhone, adminId);

  return {
    hospitals: hospitalStep.added,
    doctors: doctorStep.added,
    patients: patientStep.added,
    consultations: consultationsAdded,
    doctorLists: listsAdded,
  };
};
