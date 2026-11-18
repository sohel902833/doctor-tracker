/**
 * Prepares a database for use. Runs on every server start (and via
 * `npm run seed`). Safe to run again: it only creates what is missing and
 * never overwrites existing roles, users or medicines.
 *
 * 1. Syncs indexes for every collection
 * 2. Creates the default roles (Super Admin, Doctor, Patient)
 * 3. Creates the first Super Admin (SEED_ADMIN_* env vars)
 * 4. Imports the medicine catalog (backend/data/medicines) if not imported yet
 * 5. Imports demo hospitals, doctors, patients and consultations
 *    (backend/data/demo) when SEED_DEMO_DATA=true
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { ConsultationModel } from "../modules/consultation/consultation.model";
import { DoctorPatientModel } from "../modules/doctorPatient/doctorPatient.model";
import { HospitalModel } from "../modules/hospital/hospital.model";
import { GenericModel } from "../modules/medicine/generic.model";
import {
  importGenerics,
  importMedicines,
  type ImportResult,
} from "../modules/medicine/medicine.import";
import { MedicineModel } from "../modules/medicine/medicine.model";
import { RoleModel } from "../modules/role/role.model";
import { UserModel } from "../modules/user/user.model";
import type { UserType } from "../shared/constants/userTypes";
import { CounterModel } from "../shared/models/counter.model";
import { importDemoData } from "./demo-import";
import {
  appPermissions,
  Modules,
} from "../shared/permissions/appPermissions";
import { caseInsensitive } from "../shared/utils/collation";
import { emailSchema, passwordSchema } from "../shared/validation/common";

// Optional: without them (e.g. in production) the admin step is skipped.
const adminEnv = z
  .object({
    SEED_ADMIN_NAME: z.string().min(1).default("Super Admin"),
    SEED_ADMIN_EMAIL: emailSchema,
    SEED_ADMIN_PASSWORD: passwordSchema,
  })
  .safeParse(process.env);

// Demo data is opt-in, so production never gets fake records.
const demoEnv = z
  .object({
    SEED_DEMO_DATA: z.enum(["true", "false"]).default("false"),
    SEED_DEMO_PASSWORD: passwordSchema.default("Doctor@123"),
  })
  .parse(process.env);

const log = (message: string) => console.log(`[seed] ${message}`);

const grant = <M extends keyof typeof appPermissions>(
  module: M,
  actions: (keyof (typeof appPermissions)[M])[],
) => ({ [module]: Object.fromEntries(actions.map((action) => [action, true])) });

// ---------- Steps ----------

const syncAllIndexes = async () => {
  const models = [
    RoleModel,
    UserModel,
    HospitalModel,
    GenericModel,
    MedicineModel,
    DoctorPatientModel,
    ConsultationModel,
    CounterModel,
  ];
  for (const model of models) {
    await model.syncIndexes();
  }
  log(`✔ Indexes synced (${models.length} collections)`);
};

/** Creates the role only if no role with that name exists yet. */
const ensureRole = async (role: {
  name: string;
  userType: UserType;
  permissions: Record<string, unknown>;
  subordinateRoles?: mongoose.Types.ObjectId[];
}) => {
  const existing = await RoleModel.findOne({ name: role.name })
    .collation(caseInsensitive)
    .lean();
  if (existing) {
    log(`• Role "${role.name}" already exists`);
    return existing._id;
  }

  const created = await RoleModel.create(role);
  log(`✔ Role "${role.name}" created`);
  return created._id;
};

const ensureRoles = async () => {
  const patientRoleId = await ensureRole({
    name: "Patient",
    userType: "PATIENT",
    permissions: {},
  });

  const doctorRoleId = await ensureRole({
    name: "Doctor",
    userType: "DOCTOR",
    permissions: {
      ...grant(Modules.PATIENT, ["read", "create", "update"]),
      ...grant(Modules.CONSULTATION, ["read", "create"]),
      ...grant(Modules.MEDICINE, ["read"]),
      ...grant(Modules.HOSPITAL, ["read"]),
    },
    subordinateRoles: [patientRoleId],
  });

  const superAdminRoleId = await ensureRole({
    name: "Super Admin",
    userType: "ADMIN",
    permissions: { GLOBAL: { hasAllPermission: true } },
    subordinateRoles: [doctorRoleId, patientRoleId],
  });

  return { superAdminRoleId };
};

/** Returns the admin's login email, or null when SEED_ADMIN_* is not set. */
const ensureSuperAdmin = async (roleId: mongoose.Types.ObjectId) => {
  if (!adminEnv.success) {
    log("⚠ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set (or invalid): admin step skipped");
    return null;
  }

  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = adminEnv.data;
  if (await UserModel.exists({ email: SEED_ADMIN_EMAIL })) {
    log(`• Admin "${SEED_ADMIN_EMAIL}" already exists`);
    return SEED_ADMIN_EMAIL;
  }

  await UserModel.create({
    name: SEED_ADMIN_NAME,
    email: SEED_ADMIN_EMAIL,
    password: await bcrypt.hash(SEED_ADMIN_PASSWORD, 10),
    role: roleId,
    userType: "ADMIN",
  });
  log(`✔ Admin "${SEED_ADMIN_EMAIL}" created`);
  return SEED_ADMIN_EMAIL;
};

const logImport = (label: string, { total, added }: ImportResult) =>
  log(
    added
      ? `✔ ${label}: ${added} added (${total} in file)`
      : `• ${label}: all ${total} already imported`,
  );

const ensureMedicineCatalog = async () => {
  // Generics first: medicines link to them by name.
  logImport("Generics", await importGenerics());
  logImport("Medicines", await importMedicines());
};

// ---------- Run ----------

/** Expects an open MongoDB connection. */
const ensureDemoData = async () => {
  if (demoEnv.SEED_DEMO_DATA !== "true") return;

  const admin = await UserModel.findOne({ userType: "ADMIN" }).sort({ createdAt: 1 }).select("_id").lean();
  if (!admin) {
    log("⚠ Demo data skipped: no admin user (needed as the creator of demo records)");
    return;
  }

  const added = await importDemoData({ doctorPassword: demoEnv.SEED_DEMO_PASSWORD, adminId: admin._id });
  const summary = Object.entries(added).map(([name, count]) => `${count} ${name}`).join(", ");
  log(
    Object.values(added).some(Boolean)
      ? `✔ Demo data added: ${summary}`
      : "• Demo data: already imported",
  );
};

export const runSeed = async () => {
  await syncAllIndexes();
  const { superAdminRoleId } = await ensureRoles();
  const adminEmail = await ensureSuperAdmin(superAdminRoleId);
  await ensureMedicineCatalog();
  await ensureDemoData();

  log("Seed complete");
  // The password is never logged; it comes from SEED_ADMIN_PASSWORD.
  if (adminEmail) log(`Admin login: ${adminEmail} (password: SEED_ADMIN_PASSWORD)`);
};
