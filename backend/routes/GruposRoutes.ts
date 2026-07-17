import { Router } from "express";
import { DB } from "../server/config/db";
import { GruposController } from "../controllers/GruposController";
const ValidarToken = require("../middleware/ValidateToken");

export default function GruposRoutes(db: DB): Router {
  const router = Router();
  const con = GruposController(db);

  router.post('/ObtenerGrupos',  ValidarToken, con.ObtenerGrupos);
  router.post('/GuardarGrupo',   ValidarToken, con.GuardarGrupo);
  router.post('/EliminarGrupo',  ValidarToken, con.EliminarGrupo);

  return router;
}
