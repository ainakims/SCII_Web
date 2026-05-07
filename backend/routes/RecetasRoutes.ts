import { Router } from "express";
import { DB } from "../server/config/db";
import { RecetasController } from "../controllers/RecetasController";
const ValidarToken = require("../middleware/ValidateToken");

export default function RecetasRoutes(db: DB): Router {
  const router = Router();
  const con = RecetasController(db);

  router.post('/ObtenerRecetas', ValidarToken, con.ObtenerRecetas);

  return router;
}