"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PacientesRoutes;
const express_1 = require("express");
const PacientesController_1 = require("../controllers/PacientesController");
const ValidarToken = require("../middleware/ValidateToken");
function PacientesRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, PacientesController_1.PacientesController)(db);
    router.post('/ObtenerPacientes', ValidarToken, con.ObtenerPacientes);
    router.post('/ObtenerProveedor', ValidarToken, con.ObtenerProveedor);
    router.post('/GenerarPaciente', ValidarToken, con.GenerarPaciente);
    router.post('/EliminaPaciente', ValidarToken, con.EliminaPaciente);
    router.post('/EdicionPaciente/:id', ValidarToken, con.EdicionPaciente);
    router.post('/VerificarCURP', ValidarToken, con.VerificarCURP);
    return router;
}
