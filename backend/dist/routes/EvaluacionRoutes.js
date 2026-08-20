"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EvaluacionRoutes;
const express_1 = require("express");
const EvaluacionController_1 = require("../controllers/EvaluacionController");
const ValidarToken = require("../middleware/ValidateToken");
function EvaluacionRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, EvaluacionController_1.EvaluacionController)(db);
    router.post('/InformacionPerfil', ValidarToken, con.InformacionPerfil);
    router.post('/AgregarEvaluacion', ValidarToken, con.AgregarEvaluacion);
    router.post('/ObtenerEvaluacion/:matricula/:pacienteId', ValidarToken, con.ObtenerEvaluacion);
    router.post('/GenerarHistoriaClinica', ValidarToken, con.GenerarHistoriaClinica);
    router.post('/GuardarBorrador', ValidarToken, con.GuardarBorrador);
    router.post('/ObtenerBorrador', ValidarToken, con.ObtenerBorrador);
    router.post('/EliminarBorrador', ValidarToken, con.EliminarBorrador);
    return router;
}
