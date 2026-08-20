"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalisisIndividualController = AnalisisIndividualController;
const analisisIndividualIA_service_1 = require("../services/analisisIndividualIA.service");
function AnalisisIndividualController() {
    const Evaluar = async (req, res) => {
        var _a;
        try {
            const { matricula } = req.body;
            if (!matricula) {
                return res.status(400).json({ ok: false, message: "Se requiere la matrícula del usuario." });
            }
            const rol = (_a = req.user) === null || _a === void 0 ? void 0 : _a.rol;
            const esUsuarioMedico = String(rol !== null && rol !== void 0 ? rol : "").toLowerCase().trim() === "médico";
            const data = await (0, analisisIndividualIA_service_1.evaluarSaludConAnalisisIA)(String(matricula), esUsuarioMedico, true);
            return res.json({ ok: true, data });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
            });
        }
    };
    const EvaluarInactivos = async (req, res) => {
        var _a;
        try {
            const { matricula } = req.body;
            if (!matricula) {
                return res.status(400).json({ ok: false, message: "Se requiere la matrícula del usuario." });
            }
            const rol = (_a = req.user) === null || _a === void 0 ? void 0 : _a.rol;
            const esUsuarioMedico = String(rol !== null && rol !== void 0 ? rol : "").toLowerCase().trim() === "médico";
            const data = await (0, analisisIndividualIA_service_1.evaluarSaludConAnalisisIA)(String(matricula), esUsuarioMedico, false);
            return res.json({ ok: true, data });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
            });
        }
    };
    return { Evaluar, EvaluarInactivos };
}
