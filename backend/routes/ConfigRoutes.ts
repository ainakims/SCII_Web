import { Router } from "express";
import { DB } from "../server/config/db";
import { ConfigController } from "../controllers/ConfigController";
const ValidarToken = require("../middleware/ValidateToken");

export default function ConfigRoutes(db: DB): Router {
  const router = Router();
  const con = ConfigController(db);

  router.post('/ObtenerUsuarios',     ValidarToken, con.ObtenerUsuarios);
  router.post('/ObtenerCuentaAD',     ValidarToken, con.ObtenerCuentaAD);
  // router.post('/ObtenerEmpleado/:id', ValidarToken, con.ObtenerEmpleado);
  router.post('/BuscarIdUsuario',     ValidarToken, con.BuscarIdUsuario);
  router.post('/GenerarUsuarios',     ValidarToken, con.GenerarUsuarios);
  router.post('/EdicionUsuarios',     ValidarToken, con.EdicionUsuarios);
  router.post('/ModificaUsuario',     ValidarToken, con.ModificaUsuario);
  router.post('/VerificarMatricula',  ValidarToken, con.VerificarMatricula);
  
  return router;
}