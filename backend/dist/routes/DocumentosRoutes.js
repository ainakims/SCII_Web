"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentosRoutes;
const express_1 = require("express");
const DocumentosController_1 = require("../controllers/DocumentosController");
const ValidarToken = require("../middleware/ValidateToken");
function DocumentosRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, DocumentosController_1.DocumentosController)(db);
    router.post('/ObtenerPaciente', ValidarToken, con.ObtenerPaciente);
    router.post('/ObtenerArchivos', ValidarToken, con.ObtenerArchivos);
    router.post('/ObtenerArchivoBytes', ValidarToken, con.ObtenerArchivoBytes);
    router.post('/SubirDocumentos', ValidarToken, con.SubirDocumentos);
    router.post('/BorraDocumentos', ValidarToken, con.BorraDocumentos);
    return router;
}
