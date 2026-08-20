"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SaludPoblacionalRoutes;
const express_1 = require("express");
const SaludPoblacionalController_1 = require("../controllers/SaludPoblacionalController");
const ValidarToken = require("../middleware/ValidateToken");
function SaludPoblacionalRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, SaludPoblacionalController_1.SaludPoblacionalController)(db);
    router.post('/ObtenerDatos', ValidarToken, con.ObtenerDatos);
    router.post('/ObtenerDatosPorEmpleado', ValidarToken, con.ObtenerDatosPorEmpleado);
    router.post('/ObtenerConsultas', ValidarToken, con.ObtenerConsultas);
    router.post('/ResumenIA', ValidarToken, con.ResumenIA);
    return router;
}
