import { Router } from "express";
import { DB } from "../server/config/db";
import { AgendaController } from "../controllers/AgendaController";
const ValidarToken = require("../middleware/ValidateToken");

export default function AgendaRoutes(db: DB): Router {
  const router = Router();
  const con = AgendaController(db);

  router.post('/ObtenerCitas',   ValidarToken, con.ObtenerCitas);
  router.post('/AgregarCitas',   ValidarToken, con.AgregarCitas);
  router.post('/EdicionCitas',   ValidarToken, con.EdicionCitas);
  router.post('/ConfirmaCita',   ValidarToken, con.ConfirmaCita);
  router.post('/EliminaCitas',   ValidarToken, con.EliminaCitas);
  router.get('/ObtenerFestivos', ValidarToken, con.ObtenerFestivos);

  return router;
}