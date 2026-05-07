import { Router } from "express";
import { DB } from "../server/config/db";
import { ConsultasController } from "../controllers/ConsultasController";
const ValidarToken = require("../middleware/ValidateToken");

export default function ConsultasRoutes(db: DB): Router {
  const router = Router();
  const con = ConsultasController(db);

  router.post('/BuscarMatricula', ValidarToken, con.BuscarMatricula);
  router.post('/BuscarProveedor', ValidarToken, con.BuscarProveedor);
  router.post('/BuscarHistorial', ValidarToken, con.BuscarHistorial);
  router.post('/BuscarRecetaMed', ValidarToken, con.BuscarRecetaMed);
  router.post('/AgregarConsulta', ValidarToken, con.AgregarConsulta);

  return router;
}