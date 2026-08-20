"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecetasController = RecetasController;
const params_web_service_1 = require("../interfaces/params_web_service");
function RecetasController(db) {
    const { executeConnection } = db;
    const ObtenerRecetas = async (req, res) => {
        try {
            const { matricula } = req.body;
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Recetas]";
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@IdConsulta", Valor: "0" },
            ];
            const consultas = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            if (!consultas || consultas.length === 0) {
                return res.status(204).json({ message: "No se pudo encontrar recetas para el paciente." });
            }
            for (let i = 0; i < consultas.length; i++) {
                const idConsulta = consultas[i].ID;
                try {
                    const params = [
                        { Nombre: "@Case", Valor: "1" },
                        { Nombre: "@Matricula", Valor: matricula },
                        { Nombre: "@IdConsulta", Valor: String(idConsulta) },
                    ];
                    const medicamentos = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
                    consultas[i].Medicamentos = medicamentos || [];
                }
                catch {
                    consultas[i].Medicamentos = [];
                }
            }
            return res.json(consultas);
        }
        catch (error) {
            return res.status(400).json({
                ok: false,
                message: error.message
            });
        }
    };
    return { ObtenerRecetas };
}
