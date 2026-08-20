"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RecetasRoutes;
const express_1 = require("express");
const consultController_1 = require("../controllers/consultController");
const ValidarToken = require("../middleware/ValidateToken");
function RecetasRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, consultController_1.consultController)(db);
    //   router.post('/',              ValidarToken, con.createConsult);
    //   router.get('/recipes/search', ValidarToken, con.searchRecipes);
    //   router.get('/patient/:id',    ValidarToken, con.getByPatient);
    router.post('/ai-analyze', ValidarToken, con.analyzeWithAI);
    return router;
}
