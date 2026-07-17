import { Router } from "express";
import { DB } from "../server/config/db";
import { DashboardController } from "../controllers/DashboardController";
const ValidarToken = require("../middleware/ValidateToken");

export default function RecetasRoutes(db: DB): Router {
  const router = Router();
  const con = DashboardController(db);

  router.post('/ObtenerTipoAtencion', ValidarToken, con.ObtenerTipoAtencion);
  router.post('/ObtenerProtocolos',   ValidarToken, con.ObtenerProtocolos);
  router.post('/ObtenerEspecialidad', ValidarToken, con.ObtenerEspecialidad);

  return router;
}