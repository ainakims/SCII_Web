import { Router } from "express";
import { DB } from "../server/config/db";
import { EvaluacionController } from "../controllers/EvaluacionController";
const ValidarToken = require("../middleware/ValidateToken");

export default function EvaluacionRoutes(db: DB): Router {
  const router = Router();
  const con = EvaluacionController(db);

  router.post('/InformacionPerfil',      ValidarToken, con.InformacionPerfil);
  router.post('/AgregarEvaluacion',      ValidarToken, con.AgregarEvaluacion);
  // router.post('/ObtenerEvaluacion/:matricula/:pacienteId/:nombre?', ValidarToken, con.ObtenerEvaluacion);
  router.post('/ObtenerEvaluacion',      ValidarToken, con.ObtenerEvaluacion);
  router.post('/GenerarHistoriaClinica', ValidarToken, con.GenerarHistoriaClinica);
  router.post('/GuardarBorrador',        ValidarToken, con.GuardarBorrador);
  router.post('/ObtenerBorrador',        ValidarToken, con.ObtenerBorrador);
  router.post('/EliminarBorrador',       ValidarToken, con.EliminarBorrador);

  return router;
}