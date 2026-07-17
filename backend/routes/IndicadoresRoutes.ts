import { Router } from "express";
import { DB } from "../server/config/db";
import { IndicadoresController } from "../controllers/IndicadoresController";
const ValidarToken = require("../middleware/ValidateToken");

export default function IndicadoresRoutes(db: DB): Router {
  const router = Router();
  const con = IndicadoresController(db);

  router.post('/ObtenerIndicadores',  ValidarToken, con.ObtenerIndicadores);
  router.post('/ObtenerMensualAnio',  ValidarToken, con.ObtenerMensualAnio);
  router.post('/ObtenerTendenciaAnual', ValidarToken, con.ObtenerTendenciaAnual);
  router.post('/ObtenerTotalesMensuales', ValidarToken, con.ObtenerTotalesMensuales);
  router.post('/ObtenerPoblacionAnual', ValidarToken, con.ObtenerPoblacionAnual);
  router.post('/ExportarCheckUp', ValidarToken, con.ExportarCheckUp);
  router.post('/GuardarIndicadores',  ValidarToken, con.GuardarIndicadores);
  router.post('/ActualizarIndicadores', ValidarToken, con.ActualizarIndicadores);

  return router;
}
