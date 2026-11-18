/** Response shapes from the backend, shared across features. */
import type { Condition, Gender, MealTiming, UserType } from "./constants";
import type { RolePermissions } from "./permissions";

export type Id = string;

export type RoleRef = { _id: Id; name: string; userType: UserType };

export type Role = RoleRef & {
  permissions: RolePermissions;
  subordinateRoles: RoleRef[];
  createdAt: string;
  updatedAt: string;
};

export type PermissionCatalog = {
  module: string;
  label: string;
  permissions: { key: string; label: string }[];
}[];

export type Hospital = {
  _id: Id;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export type DoctorProfile = {
  specialization: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  designation: string | null;
};

export type UserHospital = {
  hospital: { _id: Id; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  summary: string | null;
};

export type User = {
  _id: Id;
  name: string;
  email: string | null;
  phone: string | null;
  role: RoleRef;
  userType: UserType;
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodGroup: string | null;
  doctorProfile: DoctorProfile | null;
  patientProfile: { currentCondition: Condition | null } | null;
  hospitals: UserHospital[];
  isActive: boolean;
  createdAt: string;
};

/** GET /auth/profile: the user with their full role (permissions). */
export type SessionUser = Omit<User, "role"> & {
  role: Role;
};

export type PatientDoctor = {
  _id: Id;
  name: string;
  doctorProfile?: { specialization?: string | null };
  visitCount: number;
  lastVisitAt: string | null;
};

export type Patient = {
  _id: Id;
  name: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: Gender | null;
  bloodGroup: string | null;
  patientProfile: { currentCondition: Condition | null } | null;
  isActive: boolean;
  createdAt: string;
  doctors?: PatientDoctor[];
};

export type DoctorPatientRelation = {
  _id: Id;
  status: "ACTIVE" | "REMOVED";
  visitCount: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  lastCondition: Condition | null;
};

export type DoctorPatientRow = DoctorPatientRelation & {
  doctor: Id;
  patient: Pick<
    Patient,
    "_id" | "name" | "phone" | "email" | "gender" | "dateOfBirth" | "bloodGroup" | "age" | "patientProfile"
  >;
  createdAt: string;
};

export type Generic = {
  _id: Id;
  sourceId: number | null;
  name: string;
  drugClass: string | null;
  indication: string | null;
  brandCount?: number;
};

export type Medicine = {
  _id: Id;
  sourceId: number | null;
  name: string;
  generic: Id | Pick<Generic, "_id" | "name" | "drugClass" | "indication"> | null;
  genericName: string | null;
  dosageForm: string;
  formGroup: string;
  strength: string | null;
  manufacturer: string | null;
  type: "ALLOPATHIC" | "HERBAL";
  priceBdt: number | null;
  packageInfo: string | null;
  isActive: boolean;
};

export type PrescribedMedicine = {
  medicine: Id | null;
  name: string;
  strength: string | null;
  genericName: string | null;
  dosageForm: string | null;
  dose: string;
  schedule: { morning: number; noon: number; night: number };
  mealTiming: MealTiming;
  durationDays: number;
  instructions: string | null;
};

export type Consultation = {
  _id: Id;
  prescriptionNo: string;
  doctor: Id;
  patient: Id;
  visitNumber: number;
  visitType: "FIRST" | "FOLLOW_UP";
  visitedAt: string;
  condition: Condition;
  diagnosis: string | null;
  notes: string | null;
  medicines: PrescribedMedicine[];
  advice: string[];
  followUpDate: string | null;
  doctorSnapshot: {
    name: string;
    specialization: string | null;
    qualifications: string | null;
    registrationNo: string | null;
    designation: string | null;
    hospital: string | null;
  };
  patientSnapshot: {
    name: string;
    age: number | null;
    gender: Gender | null;
    phone: string | null;
  };
  createdAt: string;
};
