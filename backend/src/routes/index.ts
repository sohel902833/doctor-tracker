import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import consultationRoutes from "../modules/consultation/consultation.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import doctorPatientRoutes from "../modules/doctorPatient/doctorPatient.routes";
import hospitalRoutes from "../modules/hospital/hospital.routes";
import medicineRoutes from "../modules/medicine/medicine.routes";
import patientRoutes from "../modules/patient/patient.routes";
import roleRoutes from "../modules/role/role.routes";
import userRoutes from "../modules/user/user.routes";

const router = Router();
const moduleRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/roles", route: roleRoutes },
  { path: "/users", route: userRoutes },
  { path: "/hospitals", route: hospitalRoutes },
  { path: "/patients", route: patientRoutes },
  { path: "/doctors", route: doctorPatientRoutes },
  { path: "/consultations", route: consultationRoutes },
  { path: "/medicines", route: medicineRoutes },
  { path: "/dashboard", route: dashboardRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
