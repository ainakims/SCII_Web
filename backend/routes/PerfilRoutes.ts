import { Router } from "express";
import { DB } from "../server/config/db";
import { PerfilController } from "../controllers/PerfilController";

export default function PerfilRouter(db: DB): Router {
  const router = Router();
  const con = PerfilController(db);

  router.post('/UsuarioSesion', con.UsuarioSesion);
  //   router.post('/GetEvaluacion', con.GetEvaluacion);

  return router;
}