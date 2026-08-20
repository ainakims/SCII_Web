"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgendaRoutes;
const express_1 = require("express");
const AgendaController_1 = require("../controllers/AgendaController");
const ValidarToken = require("../middleware/ValidateToken");
function AgendaRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, AgendaController_1.AgendaController)(db);
    router.post('/ObtenerCitas', ValidarToken, con.ObtenerCitas);
    router.post('/AgregarCitas', ValidarToken, con.AgregarCitas);
    router.post('/EdicionCitas', ValidarToken, con.EdicionCitas);
    router.post('/ConfirmaCita', ValidarToken, con.ConfirmaCita);
    router.post('/EliminaCitas', ValidarToken, con.EliminaCitas);
    router.get('/ObtenerFestivos', ValidarToken, con.ObtenerFestivos);
    return router;
}
