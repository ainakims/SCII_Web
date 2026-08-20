"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultasController = ConsultasController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
function ConsultasController(db) {
    const { executeConnection } = db;
    const BuscarMatricula = async (req, res) => {
        try {
            const { matricula } = req.body;
            const params = [
                { Nombre: "@Matricula", Valor: matricula },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Buscar_Matricula]";
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
    const BuscarProveedor = async (req, res) => {
        try {
            const { curp } = req.body;
            const params = [
                { Nombre: "@CURP", Valor: curp },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Buscar_Proveedor]";
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
    const ObtenerAlergias = async (req, res) => {
        var _a;
        try {
            const { idPaciente, matricula } = req.body;
            const idPac = idPaciente ? String(idPaciente) : "0";
            const mat = matricula ? String(matricula).trim() : "";
            const sql = `
        SELECT TOP 1 Alergias, AlergiasMedicamento
        FROM [TNGCORE].[dbo].[SCII_Pacientes]
        WHERE Estado = 'A' AND (
          (NULLIF(@IdPaciente, '0') IS NOT NULL AND IdPaciente = @IdPaciente)
          OR (NULLIF(@Matricula, '') IS NOT NULL AND RTRIM(LTRIM(Matricula)) = @Matricula)
        )`;
            const params = [
                { Nombre: "@IdPaciente", Valor: idPac },
                { Nombre: "@Matricula", Valor: mat },
            ];
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.Consulta, params);
            return res.json({
                ok: true,
                data: (_a = result === null || result === void 0 ? void 0 : result[0]) !== null && _a !== void 0 ? _a : null
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
    const BuscarMedicionEquipo = async (req, res) => {
        var _a;
        try {
            const { idUsuario, matriculaCurp } = req.body;
            const idUser = idUsuario ? String(idUsuario) : "0";
            const matCurp = matriculaCurp ? String(matriculaCurp).trim() : "";
            const sql = `
        SELECT TOP 1 *
        FROM [TNGCORE].[dbo].[SCII_Mediciones_Equipo]
        WHERE Id_Usuario = @IdUsuario
          AND RTRIM(LTRIM(Matricula_Curp)) = @MatriculaCurp
          AND Tipo_Registro = 1
          AND RegistroLigado = 0
        ORDER BY Fecha_medicion DESC`;
            const params = [
                { Nombre: "@IdUsuario", Valor: idUser },
                { Nombre: "@MatriculaCurp", Valor: matCurp },
            ];
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.Consulta, params);
            return res.json({
                ok: true,
                data: (_a = result === null || result === void 0 ? void 0 : result[0]) !== null && _a !== void 0 ? _a : null
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
    const BuscarHistorial = async (req, res) => {
        try {
            const { idEmpleado } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@IdEmpleado", Valor: idEmpleado },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Buscar_Historial_Receta]";
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
    const BuscarRecetaMed = async (req, res) => {
        try {
            const { idEmpleado } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@IdEmpleado", Valor: idEmpleado },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Buscar_Historial_Receta]";
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
    const AgregarConsulta = async (req, res) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8;
        try {
            const { expediente } = req.body;
            const sql = "[TNGCORE].[dbo].[SCII_Agregar_Consulta]";
            const params = [
                { Nombre: "@IdMedico", Valor: String((_a = expediente.MedicoID) !== null && _a !== void 0 ? _a : 0) },
                { Nombre: "@IdPaciente", Valor: String((_b = expediente.PacienteID) !== null && _b !== void 0 ? _b : 0) },
                { Nombre: "@IdAgenda", Valor: (_d = (_c = expediente.IdAgenda) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "" },
                { Nombre: "@Matricula", Valor: String((_e = expediente.Matricula) !== null && _e !== void 0 ? _e : "") },
                { Nombre: "@TipoPaciente", Valor: (_g = (_f = expediente.TipoPaciente) === null || _f === void 0 ? void 0 : _f.trim()) !== null && _g !== void 0 ? _g : "" },
                { Nombre: "@TipoAtencion", Valor: (_j = (_h = expediente.TipoAtencion) === null || _h === void 0 ? void 0 : _h.trim()) !== null && _j !== void 0 ? _j : "" },
                { Nombre: "@Fecha", Valor: expediente.FechaConsulta ? `${expediente.FechaConsulta}:00`.replace("T", " ") : "" },
                { Nombre: "@Enfermedad", Valor: (_l = (_k = expediente.TipoEnfermedad) === null || _k === void 0 ? void 0 : _k.trim()) !== null && _l !== void 0 ? _l : "" },
                { Nombre: "@Protocolo", Valor: String(parseInt(expediente.ProtocoloAtencion) || 0) },
                { Nombre: "@Procedimiento", Valor: ((_m = expediente.Procedimiento) === null || _m === void 0 ? void 0 : _m.trim()) || null },
                { Nombre: "@Padecimiento", Valor: (_p = (_o = expediente.PadecimientoActual) === null || _o === void 0 ? void 0 : _o.trim()) !== null && _p !== void 0 ? _p : "" },
                { Nombre: "@Peso", Valor: String(parseFloat((_q = expediente.ExploracionFisica) === null || _q === void 0 ? void 0 : _q.Peso) || 0) },
                { Nombre: "@Talla", Valor: String(parseFloat((_r = expediente.ExploracionFisica) === null || _r === void 0 ? void 0 : _r.Talla) || 0) },
                { Nombre: "@Abdomen", Valor: String(parseFloat((_s = expediente.ExploracionFisica) === null || _s === void 0 ? void 0 : _s.Abdomen) || 0) },
                { Nombre: "@IMC", Valor: String(parseFloat((_t = expediente.ExploracionFisica) === null || _t === void 0 ? void 0 : _t.IMC) || 0) },
                { Nombre: "@SpO2", Valor: String(parseFloat((_u = expediente.ExploracionFisica) === null || _u === void 0 ? void 0 : _u.SpO2) || 0) },
                { Nombre: "@PA", Valor: (_w = (_v = expediente.ExploracionFisica) === null || _v === void 0 ? void 0 : _v.PA) !== null && _w !== void 0 ? _w : "" },
                { Nombre: "@TA", Valor: (_y = (_x = expediente.ExploracionFisica) === null || _x === void 0 ? void 0 : _x.TA) !== null && _y !== void 0 ? _y : "" },
                { Nombre: "@FC", Valor: (_0 = (_z = expediente.ExploracionFisica) === null || _z === void 0 ? void 0 : _z.FC) !== null && _0 !== void 0 ? _0 : "" },
                { Nombre: "@FR", Valor: (_2 = (_1 = expediente.ExploracionFisica) === null || _1 === void 0 ? void 0 : _1.FR) !== null && _2 !== void 0 ? _2 : "" },
                { Nombre: "@Diagnostico", Valor: (_4 = (_3 = expediente.Diagnostico) === null || _3 === void 0 ? void 0 : _3.trim()) !== null && _4 !== void 0 ? _4 : "" },
                { Nombre: "@Recomendacion", Valor: (_6 = (_5 = expediente.Recomendaciones) === null || _5 === void 0 ? void 0 : _5.trim()) !== null && _6 !== void 0 ? _6 : "" },
            ];
            const paramsCon = [
                { Nombre: "@Case", Valor: "0" },
                ...params,
                { Nombre: "@ConsultaID", Valor: "0" },
                { Nombre: "@Farmaco", Valor: "" },
                { Nombre: "@Dosis", Valor: "" },
                { Nombre: "@Frecuencia", Valor: "0" },
                { Nombre: "@Duracion", Valor: "0" },
            ];
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsCon);
            if (!result || result.length === 0) {
                throw new Error("Ocurrió un error al guardar la consulta.");
            }
            const consultaId = result[0].ID;
            const receta = (expediente.RecetaEstructurada || []).filter((m) => (m === null || m === void 0 ? void 0 : m.medicamento) && m.medicamento.trim() !== "");
            let inserted = 0;
            if (receta.length > 0) {
                for (const med of receta) {
                    const paramsRec = [
                        { Nombre: "@Case", Valor: "1" },
                        ...params,
                        { Nombre: "@ConsultaID", Valor: String(consultaId) },
                        { Nombre: "@Farmaco", Valor: med.medicamento.trim() },
                        { Nombre: "@Dosis", Valor: (_8 = (_7 = med.dosis) === null || _7 === void 0 ? void 0 : _7.trim()) !== null && _8 !== void 0 ? _8 : "" },
                        { Nombre: "@Frecuencia", Valor: String(parseInt(med.frecuencia) || 0) },
                        { Nombre: "@Duracion", Valor: String(parseInt(med.duracion) || 0) },
                    ];
                    await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsRec);
                    inserted++;
                }
            }
            if (receta.length > 0) {
                if (inserted > 0) {
                    return res.json({
                        ok: true,
                        consultaId,
                        inserted
                    });
                }
                else {
                    return res.status(400).json({
                        ok: false,
                        message: "Se guardó la consulta sin recetar medicamento."
                    });
                }
            }
            return res.json({
                ok: true,
                consultaId
            });
        }
        catch (error) {
            return res.status(400).json({
                ok: false,
                message: error.message
            });
        }
    };
    const EliminarConsulta = async (req, res) => {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({
                    ok: false,
                    message: "Se requiere el ID de la consulta a eliminar."
                });
            }
            const sql = "[TNGCORE].[dbo].[SCII_Agregar_Consulta]";
            const paramsBase = [
                { Nombre: "@ConsultaID", Valor: String(id) },
            ];
            await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                { Nombre: "@Case", Valor: "2" },
                ...paramsBase,
            ]);
            await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                { Nombre: "@Case", Valor: "3" },
                ...paramsBase,
            ]);
            return res.json({
                ok: true
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
    return { BuscarMatricula, BuscarProveedor, BuscarHistorial, BuscarRecetaMed, AgregarConsulta, ObtenerAlergias, BuscarMedicionEquipo, EliminarConsulta };
}
