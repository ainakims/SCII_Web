import { Router } from "express";
import { DB } from "../server/config/db";
import { SaludPoblacionalController } from "../controllers/SaludPoblacionalController";
const ValidarToken = require("../middleware/ValidateToken");

export default function SaludPoblacionalRoutes(db: DB): Router {
  const router = Router();
  const con = SaludPoblacionalController(db);

  router.post('/ObtenerDatos', ValidarToken, con.ObtenerDatos);
  router.post('/ResumenIA', ValidarToken, con.ResumenIA);

  return router;
}
