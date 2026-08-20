"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerfilRouter;
const express_1 = require("express");
const PerfilController_1 = require("../controllers/PerfilController");
function PerfilRouter(db) {
    const router = (0, express_1.Router)();
    const con = (0, PerfilController_1.PerfilController)(db);
    router.post('/UsuarioSesion', con.UsuarioSesion);
    //   router.post('/GetEvaluacion', con.GetEvaluacion);
    return router;
}
