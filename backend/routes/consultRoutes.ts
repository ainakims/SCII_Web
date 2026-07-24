import { Router } from "express";
import { DB } from "../server/config/db";
import { consultController } from "../controllers/consultController";
const ValidarToken = require("../middleware/ValidateToken");

export default function RecetasRoutes(db: DB): Router {
  const router = Router();
  const con = consultController(db);

//   router.post('/',              ValidarToken, con.createConsult);
//   router.get('/recipes/search', ValidarToken, con.searchRecipes);
//   router.get('/patient/:id',    ValidarToken, con.getByPatient);
  router.post('/ai-analyze',    ValidarToken, con.analyzeWithAI);

  return router;
}