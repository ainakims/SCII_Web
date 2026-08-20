"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IndicadoresRoutes;
const express_1 = require("express");
const IndicadoresController_1 = require("../controllers/IndicadoresController");
const ValidarToken = require("../middleware/ValidateToken");
function IndicadoresRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, IndicadoresController_1.IndicadoresController)(db);
    router.post('/ObtenerIndicadores', ValidarToken, con.ObtenerIndicadores);
    router.post('/ObtenerMensualAnio', ValidarToken, con.ObtenerMensualAnio);
    router.post('/ObtenerTendenciaAnual', ValidarToken, con.ObtenerTendenciaAnual);
    router.post('/ObtenerTotalesMensuales', ValidarToken, con.ObtenerTotalesMensuales);
    router.post('/ObtenerPoblacionAnual', ValidarToken, con.ObtenerPoblacionAnual);
    router.post('/ExportarCheckUp', ValidarToken, con.ExportarCheckUp);
    router.post('/GuardarIndicadores', ValidarToken, con.GuardarIndicadores);
    router.post('/ActualizarIndicadores', ValidarToken, con.ActualizarIndicadores);
    return router;
}
