"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConfigRoutes;
const express_1 = require("express");
const ConfigController_1 = require("../controllers/ConfigController");
const ValidarToken = require("../middleware/ValidateToken");
function ConfigRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, ConfigController_1.ConfigController)(db);
    router.post('/ObtenerUsuarios', ValidarToken, con.ObtenerUsuarios);
    router.post('/ObtenerCuentaAD', ValidarToken, con.ObtenerCuentaAD);
    // router.post('/ObtenerEmpleado/:id', ValidarToken, con.ObtenerEmpleado);
    router.post('/BuscarIdUsuario', ValidarToken, con.BuscarIdUsuario);
    router.post('/GenerarUsuarios', ValidarToken, con.GenerarUsuarios);
    router.post('/EdicionUsuarios', ValidarToken, con.EdicionUsuarios);
    router.post('/ModificaUsuario', ValidarToken, con.ModificaUsuario);
    router.post('/VerificarMatricula', ValidarToken, con.VerificarMatricula);
    return router;
}
