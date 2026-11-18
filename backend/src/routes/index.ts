import { Router } from "express";
import hospitalRoutes from "../modules/hospital/hospital.routes";
import roleRoutes from "../modules/role/role.routes";
import userRoutes from "../modules/user/user.routes";

const router = Router();
const moduleRoutes = [
  { path: "/roles", route: roleRoutes },
  { path: "/users", route: userRoutes },
  { path: "/hospitals", route: hospitalRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
