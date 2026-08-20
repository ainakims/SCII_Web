"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConsultasRoutes;
const express_1 = require("express");
const ConsultasController_1 = require("../controllers/ConsultasController");
const ValidarToken = require("../middleware/ValidateToken");
function ConsultasRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, ConsultasController_1.ConsultasController)(db);
    router.post('/BuscarMatricula', ValidarToken, con.BuscarMatricula);
    router.post('/BuscarProveedor', ValidarToken, con.BuscarProveedor);
    router.post('/BuscarHistorial', ValidarToken, con.BuscarHistorial);
    router.post('/ObtenerAlergias', ValidarToken, con.ObtenerAlergias);
    router.post('/BuscarMedicionEquipo', ValidarToken, con.BuscarMedicionEquipo);
    router.post('/BuscarRecetaMed', ValidarToken, con.BuscarRecetaMed);
    router.post('/AgregarConsulta', ValidarToken, con.AgregarConsulta);
    router.post('/EliminarConsulta', ValidarToken, con.EliminarConsulta);
    return router;
}
