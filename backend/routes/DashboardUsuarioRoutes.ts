import { Router } from "express";
import { DB } from "../server/config/db";
import { DashboardUsuarioController } from "../controllers/DashboardUsuarioController";
const ValidarToken = require("../middleware/ValidateToken");

export default function DashboardUsuarioRoutes(db: DB): Router {
  const router = Router();
  const con = DashboardUsuarioController(db);

  router.post('/ObtenerResumenPropio', ValidarToken, con.ObtenerResumenPropio);

  return router;
}
