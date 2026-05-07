import { Router } from "express";
import { DB } from "../server/config/db";
import { DocumentosController } from "../controllers/DocumentosController";
const ValidarToken = require("../middleware/ValidateToken");

export default function DocumentosRoutes(db: DB): Router {
  const router = Router();
  const con = DocumentosController(db);

  router.post('/ObtenerPaciente', ValidarToken, con.ObtenerPaciente);
  router.post('/ObtenerArchivos', ValidarToken, con.ObtenerArchivos);
  router.post('/SubirDocumentos', ValidarToken, con.SubirDocumentos);
  router.post('/BorraDocumentos', ValidarToken, con.BorraDocumentos);

  return router;
}