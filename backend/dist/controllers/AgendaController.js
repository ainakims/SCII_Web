"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgendaController = AgendaController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
function AgendaController(db) {
    const { executeConnection, safeExecute } = db;
    const ObtenerCitas = async (req, res) => {
        try {
            const { matricula, inicio, final } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@Inicio", Valor: inicio },
                { Nombre: "@Final", Valor: final },
                { Nombre: "@IdAgenda", Valor: null },
                { Nombre: "@Estado", Valor: '' },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
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
    const AgregarCitas = async (req, res) => {
        try {
            const { agenda } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Id", Valor: agenda.id },
                { Nombre: "@Matricula", Valor: agenda.matricula },
                { Nombre: "@Motivo", Valor: agenda.motivo },
                { Nombre: "@Dia", Valor: agenda.dia },
                { Nombre: "@Hora", Valor: agenda.hora },
                { Nombre: "@Periodo", Valor: agenda.periodo },
                { Nombre: "@Fecha", Valor: agenda.fecha },
                { Nombre: "@Duracion", Valor: agenda.duracion },
                { Nombre: "@Notas", Valor: agenda.notas },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda]";
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
    const EdicionCitas = async (req, res) => {
        try {
            const { agenda } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Id", Valor: agenda.idAgenda },
                { Nombre: "@Motivo", Valor: agenda.motivo },
                { Nombre: "@Dia", Valor: agenda.dia },
                { Nombre: "@Hora", Valor: agenda.hora },
                { Nombre: "@Periodo", Valor: agenda.periodo },
                { Nombre: "@Fecha", Valor: agenda.fecha },
                { Nombre: "@Duracion", Valor: agenda.duracion },
                { Nombre: "@Notas", Valor: agenda.notas },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda]";
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
    const ConfirmaCita = async (req, res) => {
        try {
            const { idAgenda, esActivo, consultaId } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Inicio", Valor: "" },
                { Nombre: "@Final", Valor: "" },
                { Nombre: "@IdAgenda", Valor: idAgenda },
                { Nombre: "@IdConsulta", Valor: consultaId || '' },
                { Nombre: "@Estado", Valor: esActivo },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
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
    const EliminaCitas = async (req, res) => {
        try {
            const { idAgenda } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@Inicio", Valor: "" },
                { Nombre: "@Final", Valor: "" },
                { Nombre: "@IdAgenda", Valor: idAgenda },
                { Nombre: "@Estado", Valor: '' },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
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
    const ObtenerFestivos = async (req, res) => {
        try {
            const sql = "SELECT HolDate, Description FROM [10.133.8.77].[TASTD].[dbo].[CatHolidays]";
            const result = await safeExecute(sql);
            const festivos = result.map((row) => {
                var _a;
                const fecha = new Date(row.HolDate);
                return {
                    dia: fecha.getUTCDate(),
                    mes: fecha.getUTCMonth() + 1,
                    anio: fecha.getUTCFullYear(),
                    nombre: String((_a = row.Description) !== null && _a !== void 0 ? _a : "").trim(),
                };
            });
            return res.json({ ok: true, data: festivos });
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
    return { ObtenerCitas, AgregarCitas, EdicionCitas, ConfirmaCita, EliminaCitas, ObtenerFestivos };
}
