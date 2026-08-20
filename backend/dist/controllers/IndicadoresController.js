"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicadoresController = IndicadoresController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
const { generarCheckUpExcel } = require("../services/generarCheckUpExcel");
function IndicadoresController(db) {
    const { executeConnection, safeExecute } = db;
    const ObtenerIndicadores = async (req, res) => {
        try {
            const { anio } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Anio", Valor: anio },
            ];
            // const sql = "[TNGCORE].[dbo].[SCII_Obtener_Indicadores]";
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            // const params2: Parametros[] = [
            //   { Nombre: "@Case",          Valor: "1" },
            //   { Nombre: "@Matricula",     Valor: matricula },
            // ];
            // const result2 = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params2);
            return res.json({
                ok: true,
                data: result,
                // act: result2
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const ObtenerMensualAnio = async (req, res) => {
        try {
            const { anio, matricula } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@Anio", Valor: anio },
            ];
            // console.dir(params);
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            // console.dir(result);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    // Devuelve, por trabajador y por año, el ÚLTIMO riesgo designado (la toma más reciente de ese año).
    // El SP (Case 2) debe regresar filas con: Matricula, Anio, Riesgo, IdRiesgo
    const ObtenerTendenciaAnual = async (req, res) => {
        try {
            const params = [
                { Nombre: "@Case", Valor: "2" },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    // Devuelve los totales por mes del año (@Case = 3): Mes, SANOS, MODERADO, ALTO, AUSENCIAS
    const ObtenerTotalesMensuales = async (req, res) => {
        try {
            const { anio } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "3" },
                { Nombre: "@Anio", Valor: anio },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    // Devuelve la población (Planta/DOE) por TODOS los años (@Case = 4): Anio, PLANTA, DOE
    const ObtenerPoblacionAnual = async (req, res) => {
        try {
            const params = [
                { Nombre: "@Case", Valor: "4" },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const GuardarIndicadores = async (req, res) => {
        var _a, _b, _c;
        try {
            const { payload } = req.body;
            const riesgoInt = payload.registro.riesgo ? parseInt(String(payload.registro.riesgo), 10) : null;
            // Se omiten los parámetros numéricos opcionales que vengan vacíos/null para que
            // el SP use su valor por defecto (NULL). Enviar "" o "null" rompe la conversión a numeric.
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Matricula", Valor: payload.matricula },
                { Nombre: "@Sistolica", Valor: payload.registro.sistolica },
                { Nombre: "@Diastolica", Valor: payload.registro.diastolica },
                { Nombre: "@Glucosa", Valor: payload.registro.glucosa },
                { Nombre: "@Colesterol", Valor: payload.registro.colesterol },
                { Nombre: "@Trigliceridos", Valor: payload.registro.trigliceridos },
                { Nombre: "@Peso", Valor: payload.registro.peso },
                { Nombre: "@Altura", Valor: payload.registro.altura },
                { Nombre: "@PA", Valor: payload.registro.pa },
                { Nombre: "@IMC", Valor: payload.registro.imc },
                { Nombre: "@ICT", Valor: payload.registro.ict },
                { Nombre: "@Riesgo", Valor: riesgoInt },
                { Nombre: "@Fecha", Valor: payload.registro.fecha },
            ].filter(p => p.Valor !== null && p.Valor !== undefined && String(p.Valor).trim() !== "");
            const sql = "[TNGCORE].[dbo].[SCII_Agregar_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            if (Array.isArray(payload.actividades) && payload.actividades.length > 0) {
                for (const act of payload.actividades) {
                    const params2 = [
                        { Nombre: "@Case", Valor: "1" },
                        { Nombre: "@Matricula", Valor: payload.matricula },
                        { Nombre: "@Actividad", Valor: (_a = act.actividad) !== null && _a !== void 0 ? _a : "" },
                        { Nombre: "@Estatus", Valor: (_b = act.estatus) !== null && _b !== void 0 ? _b : "" },
                        { Nombre: "@Inicio", Valor: (_c = act.fecha) !== null && _c !== void 0 ? _c : "" },
                    ];
                    await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params2);
                }
            }
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const ActualizarIndicadores = async (req, res) => {
        var _a, _b, _c;
        try {
            const { payload } = req.body;
            console.log("ACTUALIZAR - riesgo original:", payload.registro.riesgo);
            const riesgoInt = payload.registro.riesgo ? parseInt(String(payload.registro.riesgo), 10) : null;
            console.log("ACTUALIZAR - riesgo convertido:", riesgoInt);
            const params = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@Matricula", Valor: payload.matricula },
                { Nombre: "@Sistolica", Valor: payload.registro.sistolica },
                { Nombre: "@Diastolica", Valor: payload.registro.diastolica },
                { Nombre: "@Glucosa", Valor: payload.registro.glucosa },
                { Nombre: "@Colesterol", Valor: payload.registro.colesterol },
                { Nombre: "@Trigliceridos", Valor: payload.registro.trigliceridos },
                { Nombre: "@Peso", Valor: payload.registro.peso },
                { Nombre: "@Altura", Valor: payload.registro.altura },
                { Nombre: "@PA", Valor: payload.registro.pa },
                { Nombre: "@IMC", Valor: payload.registro.imc },
                { Nombre: "@ICT", Valor: payload.registro.ict },
                { Nombre: "@Riesgo", Valor: riesgoInt },
                { Nombre: "@Fecha", Valor: payload.registro.fecha },
            ].filter(p => p.Valor !== null && p.Valor !== undefined && String(p.Valor).trim() !== "");
            console.log("ACTUALIZAR - Parámetros después del filter:", JSON.stringify(params, null, 2));
            const sql = "[TNGCORE].[dbo].[SCII_Agregar_Indicadores]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            if (Array.isArray(payload.actividades) && payload.actividades.length > 0) {
                for (const act of payload.actividades) {
                    const params2 = [
                        { Nombre: "@Case", Valor: "1" },
                        { Nombre: "@Matricula", Valor: payload.matricula },
                        { Nombre: "@Actividad", Valor: (_a = act.actividad) !== null && _a !== void 0 ? _a : "" },
                        { Nombre: "@Estatus", Valor: (_b = act.estatus) !== null && _b !== void 0 ? _b : "" },
                        { Nombre: "@Inicio", Valor: (_c = act.fecha) !== null && _c !== void 0 ? _c : "" },
                    ];
                    await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params2);
                }
            }
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    // Genera el Excel de Check-up (hoja Registro) a partir de la plantilla, por cada paciente del año
    const ExportarCheckUp = async (req, res) => {
        try {
            const { anio } = req.body;
            const sql = "[TNGCORE].[dbo].[SCII_Control_Indicadores]";
            // Padrón del año (hoja Registro, columnas base)
            const registros = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Anio", Valor: anio },
            ]);
            // Tomas mensuales de TODO el año (Case 5) para llenar los bloques por mes
            let mensuales = [];
            try {
                mensuales = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                    { Nombre: "@Case", Valor: "5" },
                    { Nombre: "@Anio", Valor: anio },
                ]);
            }
            catch (e) {
                mensuales = [];
            }
            // Agrupar tomas mensuales por matrícula (cruda)
            const porMatricula = {};
            (Array.isArray(mensuales) ? mensuales : []).forEach((m) => {
                var _a;
                const mat = String((_a = m === null || m === void 0 ? void 0 : m.Matricula) !== null && _a !== void 0 ? _a : "").trim();
                if (!mat)
                    return;
                (porMatricula[mat] = porMatricula[mat] || []).push(m);
            });
            const registrosConMes = (Array.isArray(registros) ? registros : []).map((r) => {
                var _a;
                return ({
                    ...r,
                    mensuales: porMatricula[String((_a = r === null || r === void 0 ? void 0 : r.Empl_matricula) !== null && _a !== void 0 ? _a : "").trim()] || [],
                });
            });
            const buffer = generarCheckUpExcel({ anio, registros: registrosConMes });
            const nombre = `Check-up Personal Confianza ${anio}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
            return res.send(buffer);
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    return { ObtenerIndicadores, ObtenerMensualAnio, ObtenerTendenciaAnual, ObtenerTotalesMensuales, ObtenerPoblacionAnual, ExportarCheckUp, GuardarIndicadores, ActualizarIndicadores };
}
;
