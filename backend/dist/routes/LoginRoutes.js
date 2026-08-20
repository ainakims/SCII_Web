"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginRouter;
const express_1 = require("express");
const LoginController_1 = require("../controllers/LoginController");
function LoginRouter(db) {
    const router = (0, express_1.Router)();
    const con = (0, LoginController_1.LoginController)(db);
    router.post('/existAccount', con.existMicrosoftAccount);
    router.post('/validateAccount', con.valideteMicrosoftAccount);
    router.post('/checkAccountStatus', con.checkAccountStatus);
    router.post('/validateMfa', con.authenticateAccountWithMFA);
    router.post('/ValidarCodigoMFA', con.ValidarCodigoMFA);
    return router;
}
// module.exports = LoginRouter;
