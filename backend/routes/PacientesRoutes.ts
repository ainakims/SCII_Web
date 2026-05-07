import { Router } from "express";
import { DB } from "../server/config/db";
import { PacientesController } from "../controllers/PacientesController";
const ValidarToken = require("../middleware/ValidateToken");

export default function PacientesRoutes(db: DB): Router {
  const router = Router();
  const con = PacientesController(db);

  router.post('/ObtenerPacientes',    ValidarToken, con.ObtenerPacientes);
  router.post('/ObtenerProveedor',    ValidarToken, con.ObtenerProveedor);
  router.post('/GenerarPaciente',     ValidarToken, con.GenerarPaciente);
  router.post('/EliminaPaciente',     ValidarToken, con.EliminaPaciente);
  router.post('/EdicionPaciente/:id', ValidarToken, con.EdicionPaciente);
  router.post('/VerificarCURP',       ValidarToken, con.VerificarCURP);

  return router;
}