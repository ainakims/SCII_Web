import { Router } from "express";
import { AnalisisIndividualController } from "../controllers/AnalisisIndividualController";
const ValidarToken = require("../middleware/ValidateToken");

export default function AnalisisIndividualRoutes(): Router {
  const router = Router();
  const con = AnalisisIndividualController();

  router.post('/Evaluar', ValidarToken, con.Evaluar);

  return router;
}
