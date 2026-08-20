"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RecetasRoutes;
const express_1 = require("express");
const RecetasController_1 = require("../controllers/RecetasController");
const ValidarToken = require("../middleware/ValidateToken");
function RecetasRoutes(db) {
    const router = (0, express_1.Router)();
    const con = (0, RecetasController_1.RecetasController)(db);
    router.post('/ObtenerRecetas', ValidarToken, con.ObtenerRecetas);
    return router;
}
