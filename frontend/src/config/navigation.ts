import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  UsersRound,
  FilePlus2,
} from "lucide-react";
import type { UserType } from "@/lib/constants";
import type { PermissionRule } from "@/lib/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Shown only with this permission. */
  permission?: PermissionRule;
  /** Shown only to these user types. */
  userTypes?: UserType[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clinic",
    items: [
      {
        title: "New consultation",
        href: "/consultations/new",
        icon: FilePlus2,
        permission: "consultation.create",
        userTypes: ["DOCTOR"],
      },
      {
        title: "My patients",
        href: "/my-patients",
        icon: UserRound,
        permission: "patient.read",
        userTypes: ["DOCTOR"],
      },
      {
        title: "Doctors",
        href: "/doctors",
        icon: Stethoscope,
        permission: "user.read",
        userTypes: ["ADMIN"],
      },
      {
        title: "Patients",
        href: "/patients",
        icon: UsersRound,
        permission: "patient.read",
        userTypes: ["ADMIN"],
      },
      {
        title: "Consultations",
        href: "/consultations",
        icon: ClipboardList,
        permission: "consultation.read",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Medicines", href: "/medicines", icon: Pill, permission: "medicine.read" },
      {
        title: "Hospitals",
        href: "/hospitals",
        icon: Building2,
        permission: "hospital.read",
        userTypes: ["ADMIN"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users", href: "/users", icon: Users, permission: "user.read", userTypes: ["ADMIN"] },
      { title: "Roles", href: "/roles", icon: ShieldCheck, permission: "role.read", userTypes: ["ADMIN"] },
    ],
  },
];
