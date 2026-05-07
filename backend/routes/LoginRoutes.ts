import { Router } from "express";
import { DB } from "../server/config/db";
import { LoginController } from "../controllers/LoginController";

export default function LoginRouter(db: DB): Router {
  const router = Router();
  const con = LoginController(db);

  router.post('/existAccount',        con.existMicrosoftAccount);
  router.post('/validateAccount',     con.valideteMicrosoftAccount);
  router.post('/checkAccountStatus',  con.checkAccountStatus);
  router.post('/validateMfa',         con.authenticateAccountWithMFA);
  router.post('/ValidarCodigoMFA',    con.ValidarCodigoMFA);

  return router;
}

// module.exports = LoginRouter;