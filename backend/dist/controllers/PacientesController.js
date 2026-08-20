"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacientesController = PacientesController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
const simpleCache_1 = require("../utils/simpleCache");
// La lista de pacientes/reingresos casi no cambia y el SP es pesado — se
// cachea 20 minutos por cada valor de @Activo (activos y reingresos son
// universos distintos, cada uno con su propia entrada). Las escrituras
// (GenerarPaciente/EdicionPaciente/EliminaPaciente) invalidan ambas al
// terminar, así que el cache nunca sirve algo desactualizado por un cambio
// hecho desde este mismo backend — solo evita relecturas repetidas.
const TTL_CACHE_PACIENTES_MS = 20 * 60 * 1000;
const KEY_PACIENTES_ACTIVOS = "pacientes:1";
const KEY_PACIENTES_INACTIVOS = "pacientes:0";
const KEY_PROVEEDORES = "pacientes:proveedores";
function PacientesController(db) {
    const { executeConnection } = db;
    const ObtenerPacientes = async (req, res) => {
        try {
            const { esActivo } = req.body;
            const activo = esActivo === false || esActivo === "0" ? "0" : "1";
            const cacheKey = activo === "1" ? KEY_PACIENTES_ACTIVOS : KEY_PACIENTES_INACTIVOS;
            const cacheado = (0, simpleCache_1.cacheGet)(cacheKey);
            if (cacheado !== undefined) {
                return res.json({ ok: true, data: cacheado });
            }
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Activo", Valor: activo }
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Pacientes]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            (0, simpleCache_1.cacheSet)(cacheKey, result, TTL_CACHE_PACIENTES_MS);
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
    const ObtenerProveedor = async (req, res) => {
        try {
            const cacheado = (0, simpleCache_1.cacheGet)(KEY_PROVEEDORES);
            if (cacheado !== undefined) {
                return res.json({ ok: true, data: cacheado });
            }
            const params = [
                { Nombre: "@Case", Valor: "1" }
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Pacientes]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            (0, simpleCache_1.cacheSet)(KEY_PROVEEDORES, result, TTL_CACHE_PACIENTES_MS);
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
    const GenerarPaciente = async (req, res) => {
        try {
            const { Matricula, Proveedor, CURP, NSS, FechaNacimiento, Nombre, Sexo, TipoSanguineo, Alergias, EnfermedadesCronicas, TratamientosActuales, AlergiasMedicamentos, Cirugias, Fracturas, Riesgo } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@IdPaciente", Valor: "" },
                { Nombre: "@Matricula", Valor: String(Matricula !== null && Matricula !== void 0 ? Matricula : "0").trim() },
                { Nombre: "@Proveedor", Valor: String(Proveedor !== null && Proveedor !== void 0 ? Proveedor : "").trim() },
                { Nombre: "@CURP", Valor: String(CURP !== null && CURP !== void 0 ? CURP : "").trim() },
                { Nombre: "@NSS", Valor: String(NSS !== null && NSS !== void 0 ? NSS : "").trim() },
                { Nombre: "@Nombre", Valor: String(Nombre !== null && Nombre !== void 0 ? Nombre : "").trim() },
                { Nombre: "@FechaNacimiento", Valor: String(FechaNacimiento !== null && FechaNacimiento !== void 0 ? FechaNacimiento : "").trim() },
                { Nombre: "@Sexo", Valor: String(Sexo !== null && Sexo !== void 0 ? Sexo : "").trim() },
                { Nombre: "@TipoSanguineo", Valor: String(TipoSanguineo !== null && TipoSanguineo !== void 0 ? TipoSanguineo : "").trim() },
                { Nombre: "@Alergias", Valor: String(Alergias !== null && Alergias !== void 0 ? Alergias : "").trim() },
                { Nombre: "@Enfermedades", Valor: String(EnfermedadesCronicas !== null && EnfermedadesCronicas !== void 0 ? EnfermedadesCronicas : "").trim() },
                { Nombre: "@Tratamientos", Valor: String(TratamientosActuales !== null && TratamientosActuales !== void 0 ? TratamientosActuales : "").trim() },
                { Nombre: "@AlergiasMedicamento", Valor: String(AlergiasMedicamentos !== null && AlergiasMedicamentos !== void 0 ? AlergiasMedicamentos : "").trim() },
                { Nombre: "@Cirugias", Valor: String(Cirugias !== null && Cirugias !== void 0 ? Cirugias : "").trim() },
                { Nombre: "@Fracturas", Valor: String(Fracturas !== null && Fracturas !== void 0 ? Fracturas : "").trim() },
                { Nombre: "@Riesgo", Valor: String(Riesgo !== null && Riesgo !== void 0 ? Riesgo : "").trim() },
                { Nombre: "@Tipo", Valor: String(Matricula ? Matricula == "0" ? "E" : "I" : "") },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            (0, simpleCache_1.cacheInvalidar)(KEY_PACIENTES_ACTIVOS, KEY_PACIENTES_INACTIVOS);
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
    const EdicionPaciente = async (req, res) => {
        try {
            const { id } = req.params;
            const { Matricula, Proveedor, CURP, NSS, FechaNacimiento, Nombre, Sexo, TipoSanguineo, Alergias, EnfermedadesCronicas, TratamientosActuales, AlergiasMedicamentos, Cirugias, Fracturas, Riesgo } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@IdPaciente", Valor: String(id !== null && id !== void 0 ? id : "").trim() },
                { Nombre: "@Matricula", Valor: String(Matricula !== null && Matricula !== void 0 ? Matricula : "0").trim() },
                { Nombre: "@Proveedor", Valor: String(Proveedor !== null && Proveedor !== void 0 ? Proveedor : "").trim() },
                { Nombre: "@CURP", Valor: String(CURP !== null && CURP !== void 0 ? CURP : "").trim() },
                { Nombre: "@NSS", Valor: String(NSS !== null && NSS !== void 0 ? NSS : "").trim() },
                { Nombre: "@Nombre", Valor: String(Nombre !== null && Nombre !== void 0 ? Nombre : "").trim() },
                { Nombre: "@FechaNacimiento", Valor: String(FechaNacimiento !== null && FechaNacimiento !== void 0 ? FechaNacimiento : "").trim() },
                { Nombre: "@Sexo", Valor: String(Sexo !== null && Sexo !== void 0 ? Sexo : "").trim() },
                { Nombre: "@TipoSanguineo", Valor: String(TipoSanguineo !== null && TipoSanguineo !== void 0 ? TipoSanguineo : "").trim() },
                { Nombre: "@Alergias", Valor: String(Alergias !== null && Alergias !== void 0 ? Alergias : "").trim() },
                { Nombre: "@Enfermedades", Valor: String(EnfermedadesCronicas !== null && EnfermedadesCronicas !== void 0 ? EnfermedadesCronicas : "").trim() },
                { Nombre: "@Tratamientos", Valor: String(TratamientosActuales !== null && TratamientosActuales !== void 0 ? TratamientosActuales : "").trim() },
                { Nombre: "@AlergiasMedicamento", Valor: String(AlergiasMedicamentos !== null && AlergiasMedicamentos !== void 0 ? AlergiasMedicamentos : "").trim() },
                { Nombre: "@Cirugias", Valor: String(Cirugias !== null && Cirugias !== void 0 ? Cirugias : "").trim() },
                { Nombre: "@Fracturas", Valor: String(Fracturas !== null && Fracturas !== void 0 ? Fracturas : "").trim() },
                { Nombre: "@Riesgo", Valor: String(Riesgo !== null && Riesgo !== void 0 ? Riesgo : "").trim() },
                { Nombre: "@Tipo", Valor: "" },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            (0, simpleCache_1.cacheInvalidar)(KEY_PACIENTES_ACTIVOS, KEY_PACIENTES_INACTIVOS);
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
    const EliminaPaciente = async (req, res) => {
        try {
            const { id } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@IdPaciente", Valor: id },
                { Nombre: "@Matricula", Valor: "" },
                { Nombre: "@Proveedor", Valor: "" },
                { Nombre: "@CURP", Valor: "" },
                { Nombre: "@NSS", Valor: "" },
                { Nombre: "@Nombre", Valor: "" },
                { Nombre: "@FechaNacimiento", Valor: "" },
                { Nombre: "@Sexo", Valor: "" },
                { Nombre: "@TipoSanguineo", Valor: "" },
                { Nombre: "@Alergias", Valor: "" },
                { Nombre: "@Enfermedades", Valor: "" },
                { Nombre: "@Tratamientos", Valor: "" },
                { Nombre: "@AlergiasMedicamento", Valor: "" },
                { Nombre: "@Cirugias", Valor: "" },
                { Nombre: "@Fracturas", Valor: "" },
                { Nombre: "@Riesgo", Valor: "" },
                { Nombre: "@Tipo", Valor: "" },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            (0, simpleCache_1.cacheInvalidar)(KEY_PACIENTES_ACTIVOS, KEY_PACIENTES_INACTIVOS);
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
    const VerificarCURP = async (req, res) => {
        try {
            const { curp, idPaciente } = req.body;
            const params = [
                { Nombre: "@CURP", Valor: String(curp !== null && curp !== void 0 ? curp : "").trim() },
            ];
            const sql = `SELECT IdPaciente FROM [TNGCORE].[dbo].[SCII_Pacientes] WHERE RTRIM(LTRIM(CURP)) = @CURP AND Estado = 'A'`;
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.Consulta, params);
            if (result.length === 0) {
                return res.json({ ok: true, duplicado: false });
            }
            // Si todos los registros encontrados son del mismo paciente que se edita, no es duplicado
            const esMismoPaciente = idPaciente && result.every(r => r.IdPaciente === Number(idPaciente));
            if (esMismoPaciente) {
                return res.json({ ok: true, duplicado: false });
            }
            return res.json({ ok: true, duplicado: true });
        }
        catch (error) {
            return res.status(500).json({ ok: false, error: "Error interno", message: error.message });
        }
    };
    return { ObtenerPacientes, ObtenerProveedor, GenerarPaciente, EdicionPaciente, EliminaPaciente, VerificarCURP };
}
