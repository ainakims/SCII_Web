"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AnalisisIndividualRoutes;
const express_1 = require("express");
const AnalisisIndividualController_1 = require("../controllers/AnalisisIndividualController");
const ValidarToken = require("../middleware/ValidateToken");
function AnalisisIndividualRoutes() {
    const router = (0, express_1.Router)();
    const con = (0, AnalisisIndividualController_1.AnalisisIndividualController)();
    router.post('/Evaluar', ValidarToken, con.Evaluar);
    router.post('/EvaluarInactivos', ValidarToken, con.EvaluarInactivos);
    return router;
}
