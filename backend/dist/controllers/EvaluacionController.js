"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluacionController = EvaluacionController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
const fs = require("fs");
const path = require("path");
// const { poolPromise, sql } = require("../server/config/db");
const { generarHistoriaClinicaDocx } = require("../services/generarHistoriaClinica");
const { generarPDF } = require("../services/generarPDF");
function EvaluacionController(db) {
    const { executeConnection } = db;
    const InformacionPerfil = async (req, res) => {
        try {
            const { matricula } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                // { Nombre: "@PacienteId", Valor: "" },
                { Nombre: "@Matricula", Valor: String(matricula !== null && matricula !== void 0 ? matricula : "") },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                message: error.message,
            });
        }
    };
    const AgregarEvaluacion = async (req, res) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18;
        try {
            const { medico, paciente, matricula, ficha, edadInicioLaboral, antLaborales, agentes, antFamiliares, antPatologicos, vacunas, antNoPatologico, gineco, incapacidadRiesgo, incapacidadValuacion, incapacidadEG, incapacidadComentario, enfermedadActual, manoDominante, vitalSigns, expCabeza, expOidos, expOjos, agudezaOD, agudezaOI, usaLentes, expBoca, expNariz, expCuello, expPrecordial, expMTor, expMPel, expAbdomen, expGenitales, expPiel, expColCervical, expColLumbar, labs, expRadiografia, expHallazgos, expGabinete, conclusiones } = req.body;
            const sql = "[TNGCORE].[dbo].[SCII_Agregar_Evaluacion]";
            const paramsFicha = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Matricula", Valor: String((_a = matricula.trim()) !== null && _a !== void 0 ? _a : null) },
                { Nombre: "@FechaNacimiento", Valor: String((_b = ficha === null || ficha === void 0 ? void 0 : ficha.fechaNacimiento.trim()) !== null && _b !== void 0 ? _b : null) },
                { Nombre: "@Genero", Valor: String((_c = ficha === null || ficha === void 0 ? void 0 : ficha.genero.trim()) !== null && _c !== void 0 ? _c : null).trim() },
                { Nombre: "@EstadoCivil", Valor: String((_d = ficha === null || ficha === void 0 ? void 0 : ficha.estadoCivil.trim()) !== null && _d !== void 0 ? _d : null) },
                { Nombre: "@Escolaridad", Valor: String((_e = ficha === null || ficha === void 0 ? void 0 : ficha.escolaridad.trim()) !== null && _e !== void 0 ? _e : null).trim() },
                { Nombre: "@NoIMSS", Valor: String((_f = ficha === null || ficha === void 0 ? void 0 : ficha.noImss.trim()) !== null && _f !== void 0 ? _f : null) },
                { Nombre: "@Contacto", Valor: String((_g = ficha === null || ficha === void 0 ? void 0 : ficha.contactoEmergencia) !== null && _g !== void 0 ? _g : null) },
                { Nombre: "@NumContacto", Valor: String((_h = ficha === null || ficha === void 0 ? void 0 : ficha.numeroContacto) !== null && _h !== void 0 ? _h : null) },
            ];
            const resultFicha = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsFicha);
            const idFicha = resultFicha[0].IdFicha;
            const paramsLaboral = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@EdadInicio", Valor: String(edadInicioLaboral !== null && edadInicioLaboral !== void 0 ? edadInicioLaboral : null) },
                { Nombre: "@AntecedenteLaboral", Valor: JSON.stringify(antLaborales || []) },
                { Nombre: "@ExposicionAgentes", Valor: JSON.stringify(agentes || {}) },
            ];
            const hayLaboral = (edadInicioLaboral !== null && edadInicioLaboral !== undefined && String(edadInicioLaboral).trim() !== "") ||
                (Array.isArray(antLaborales) && antLaborales.some((r) => { var _a, _b, _c; return String((_a = r.empresa) !== null && _a !== void 0 ? _a : "").trim() || String((_b = r.puesto) !== null && _b !== void 0 ? _b : "").trim() || String((_c = r.tiempo) !== null && _c !== void 0 ? _c : "").trim(); })) ||
                (agentes && typeof agentes === "object" && Object.values(agentes).some((v) => {
                    var _a, _b;
                    return Array.isArray(v)
                        ? v.some((o) => { var _a, _b, _c; return String((_a = o === null || o === void 0 ? void 0 : o.tipo) !== null && _a !== void 0 ? _a : "").trim() || String((_b = o === null || o === void 0 ? void 0 : o.tiempo) !== null && _b !== void 0 ? _b : "").trim() || String((_c = o === null || o === void 0 ? void 0 : o.puesto) !== null && _c !== void 0 ? _c : "").trim(); })
                        : (String((_a = v === null || v === void 0 ? void 0 : v.tiempo) !== null && _a !== void 0 ? _a : "").trim() || String((_b = v === null || v === void 0 ? void 0 : v.puesto) !== null && _b !== void 0 ? _b : "").trim());
                }));
            let idLaboral = 0;
            if (hayLaboral) {
                const resultLaboral = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsLaboral);
                idLaboral = (_k = (_j = resultLaboral[0]) === null || _j === void 0 ? void 0 : _j.IdLaboral) !== null && _k !== void 0 ? _k : 0;
            }
            const paramsFamiliar = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@AntecedenteFamiliar", Valor: JSON.stringify(antFamiliares || {}) },
            ];
            const hayFamiliar = antFamiliares && typeof antFamiliares === "object" &&
                Object.values(antFamiliares).some((entry) => typeof entry === "object" && entry !== null &&
                    Object.values(entry).some((v) => v !== null));
            let idFamiliar = 0;
            if (hayFamiliar) {
                const resultFamiliar = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsFamiliar);
                idFamiliar = (_m = (_l = resultFamiliar[0]) === null || _l === void 0 ? void 0 : _l.IdFamiliar) !== null && _m !== void 0 ? _m : 0;
            }
            const esquemaCovid = {
                covid1ra: { checked: (_o = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covid1ra) !== null && _o !== void 0 ? _o : false, fecha: (_p = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covid1raFecha) !== null && _p !== void 0 ? _p : "" },
                covid2da: { checked: (_q = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covid2da) !== null && _q !== void 0 ? _q : false, fecha: (_r = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covid2daFecha) !== null && _r !== void 0 ? _r : "" },
                covidRF: { checked: (_s = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covidRF) !== null && _s !== void 0 ? _s : false, fecha: (_t = vacunas === null || vacunas === void 0 ? void 0 : vacunas.covidRFFecha) !== null && _t !== void 0 ? _t : "" },
            };
            const esquemaVacuna = {
                influenza: { checked: (_u = vacunas === null || vacunas === void 0 ? void 0 : vacunas.inflChk) !== null && _u !== void 0 ? _u : false, fecha: (_v = vacunas === null || vacunas === void 0 ? void 0 : vacunas.influenza) !== null && _v !== void 0 ? _v : "" },
                toxoide: { checked: (_w = vacunas === null || vacunas === void 0 ? void 0 : vacunas.toxChk) !== null && _w !== void 0 ? _w : false, fecha: (_x = vacunas === null || vacunas === void 0 ? void 0 : vacunas.toxoide) !== null && _x !== void 0 ? _x : "" },
                hepatitisB: { checked: (_y = vacunas === null || vacunas === void 0 ? void 0 : vacunas.hepaChk) !== null && _y !== void 0 ? _y : false, fecha: (_z = vacunas === null || vacunas === void 0 ? void 0 : vacunas.hepatitisB) !== null && _z !== void 0 ? _z : "" },
                neumococica: { checked: (_0 = vacunas === null || vacunas === void 0 ? void 0 : vacunas.neumoChk) !== null && _0 !== void 0 ? _0 : false, fecha: (_1 = vacunas === null || vacunas === void 0 ? void 0 : vacunas.neumococica) !== null && _1 !== void 0 ? _1 : "" },
            };
            const paramsPatologico = [
                { Nombre: "@Case", Valor: "3" },
                { Nombre: "@AntecedentePatologico", Valor: JSON.stringify(antPatologicos || {}) },
                { Nombre: "@EsquemaVacuna", Valor: JSON.stringify(esquemaVacuna) },
                { Nombre: "@EsquemaCovid", Valor: JSON.stringify(esquemaCovid) },
            ];
            var idPatologico = 0;
            const resultPatologico = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsPatologico);
            idPatologico = (_3 = (_2 = resultPatologico[0]) === null || _2 === void 0 ? void 0 : _2.IdPatologico) !== null && _3 !== void 0 ? _3 : 0;
            const paramsNoPatologico = [
                { Nombre: "@Case", Valor: "4" },
                { Nombre: "@AntecedenteNoPatologico", Valor: JSON.stringify(antNoPatologico || {}) },
            ];
            var idNoPatologico = 0;
            const resultNoPatologico = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsNoPatologico);
            idNoPatologico = (_5 = (_4 = resultNoPatologico[0]) === null || _4 === void 0 ? void 0 : _4.IdNoPatologico) !== null && _5 !== void 0 ? _5 : 0;
            const esMasculino = String((_6 = ficha === null || ficha === void 0 ? void 0 : ficha.genero) !== null && _6 !== void 0 ? _6 : "").trim().toUpperCase() === "M";
            let idGineco = 0;
            if (!esMasculino) {
                const paramsGineco = [
                    { Nombre: "@Case", Valor: "5" },
                    { Nombre: "@Menarquia", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.menarquia) },
                    { Nombre: "@Ritmo", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.ritmo) },
                    { Nombre: "@Papanicolau", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.papanicolau) },
                    { Nombre: "@FUM", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.fum) },
                    { Nombre: "@Dismenorrea", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.dismenorrea) },
                    { Nombre: "@Incapacitante", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.incapacitante) },
                    { Nombre: "@Dias", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.diasDismenorrea) },
                    { Nombre: "@Gestas", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.gestas) },
                    { Nombre: "@Partos", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.partos) },
                    { Nombre: "@Cesareas", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.cesareas) },
                    { Nombre: "@Abortos", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.abortos) },
                    { Nombre: "@Mamas", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.mamas) },
                    { Nombre: "@USG", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.usg) },
                    { Nombre: "@Mastografia", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.mastografia) },
                    { Nombre: "@BiRads", Valor: String(gineco === null || gineco === void 0 ? void 0 : gineco.birads) },
                ];
                const resultGineco = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsGineco);
                idGineco = (_8 = (_7 = resultGineco[0]) === null || _7 === void 0 ? void 0 : _7.IdGineco) !== null && _8 !== void 0 ? _8 : 0;
            }
            const paramsIncapacidad = [
                { Nombre: "@Case", Valor: "6" },
                { Nombre: "@RiesgoTrabajo", Valor: String(incapacidadRiesgo) },
                { Nombre: "@EnfermedadGral", Valor: String(incapacidadEG).trim() },
                { Nombre: "@ManoDominante", Valor: (typeof manoDominante === "string" ? manoDominante : "").trim() },
                { Nombre: "@Valuacion", Valor: String(incapacidadValuacion) },
                { Nombre: "@Comentario", Valor: String(incapacidadComentario) },
                { Nombre: "@PadeceEnfermedad", Valor: String(enfermedadActual) },
            ];
            var idIncapacidad = 0;
            const resultIncapacidad = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsIncapacidad);
            idIncapacidad = (_10 = (_9 = resultIncapacidad[0]) === null || _9 === void 0 ? void 0 : _9.IdIncapacidad) !== null && _10 !== void 0 ? _10 : 0;
            const agudezaVisual = {
                OD: agudezaOD || {},
                OI: agudezaOI || {},
                usaLentes: usaLentes !== null && usaLentes !== void 0 ? usaLentes : null,
            };
            const paramsExploracion = [
                { Nombre: "@Case", Valor: "7" },
                { Nombre: "@SignosVitales", Valor: JSON.stringify(vitalSigns || {}) },
                { Nombre: "@Cabeza", Valor: JSON.stringify(expCabeza || {}) },
                { Nombre: "@Oidos", Valor: JSON.stringify(expOidos || {}) },
                { Nombre: "@Ojos", Valor: JSON.stringify(expOjos || {}) },
                { Nombre: "@AgudezaVisual", Valor: JSON.stringify(agudezaVisual || {}) },
                { Nombre: "@Boca", Valor: JSON.stringify(expBoca || {}) },
                { Nombre: "@Nariz", Valor: JSON.stringify(expNariz || {}) },
                { Nombre: "@Cuello", Valor: JSON.stringify(expCuello || {}) },
                { Nombre: "@AreaPrecordial", Valor: JSON.stringify(expPrecordial || {}) },
                { Nombre: "@MiembrosToracicos", Valor: JSON.stringify(expMTor || {}) },
                { Nombre: "@MiembrosPelvicos", Valor: JSON.stringify(expMPel || {}) },
                { Nombre: "@Abdomen", Valor: JSON.stringify(expAbdomen || {}) },
                { Nombre: "@Genitales", Valor: JSON.stringify(expGenitales || {}) },
                { Nombre: "@PielAnexos", Valor: JSON.stringify(expPiel || {}) },
                { Nombre: "@ColumnaCervicalDorsal", Valor: JSON.stringify(expColCervical || {}) },
                { Nombre: "@ColumnaLumbar", Valor: JSON.stringify(expColLumbar || {}) },
            ];
            var idExploracion = 0;
            const resultExploracion = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsExploracion);
            idExploracion = (_12 = (_11 = resultExploracion[0]) === null || _11 === void 0 ? void 0 : _11.IdExploracion) !== null && _12 !== void 0 ? _12 : 0;
            const paramsEstudios = [
                { Nombre: "@Case", Valor: "8" },
                { Nombre: "@Laboratorio", Valor: JSON.stringify(labs || {}) },
                { Nombre: "@Radiografia", Valor: JSON.stringify(expRadiografia || {}) },
                { Nombre: "@Hallazgos", Valor: JSON.stringify(expHallazgos || {}) },
                { Nombre: "@Gabinete", Valor: JSON.stringify(expGabinete || {}) },
            ];
            var idEstudios = 0;
            const resultEstudios = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsEstudios);
            idEstudios = (_14 = (_13 = resultEstudios[0]) === null || _13 === void 0 ? void 0 : _13.IdEstudios) !== null && _14 !== void 0 ? _14 : 0;
            const diagnosticos = [
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.diagnostico1,
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.diagnostico2,
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.diagnostico3,
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.diagnostico4,
            ].filter(Boolean);
            const recomendaciones = [
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.recomendacion1,
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.recomendacion2,
                conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.recomendacion3,
            ].filter(Boolean);
            const paramsConclusion = [
                { Nombre: "@Case", Valor: "9" },
                { Nombre: "@Diagnosticos", Valor: JSON.stringify(diagnosticos) },
                { Nombre: "@Recomendaciones", Valor: JSON.stringify(recomendaciones) },
                { Nombre: "@GradoSalud", Valor: String((_15 = conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.resultado) !== null && _15 !== void 0 ? _15 : null) },
                { Nombre: "@Observaciones", Valor: String((_16 = conclusiones === null || conclusiones === void 0 ? void 0 : conclusiones.observaciones) !== null && _16 !== void 0 ? _16 : null) },
            ];
            var idConclusion = 0;
            const resultConclusion = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsConclusion);
            idConclusion = (_18 = (_17 = resultConclusion[0]) === null || _17 === void 0 ? void 0 : _17.IdConclusion) !== null && _18 !== void 0 ? _18 : 0;
            const today = new Date().toISOString().slice(0, 19).replace("T", " ");
            // console.log("matricula ", matricula);
            const paramsEvaluacion = [
                { Nombre: "@Case", Valor: "10" },
                { Nombre: "@MedicoId", Valor: medico },
                { Nombre: "@PacienteId", Valor: paciente !== null && paciente !== void 0 ? paciente : '' },
                { Nombre: "@Matricula", Valor: matricula !== null && matricula !== void 0 ? matricula : '' },
                { Nombre: "@Ficha", Valor: idFicha },
                { Nombre: "@Laboral", Valor: idLaboral },
                { Nombre: "@Familiar", Valor: idFamiliar },
                { Nombre: "@Patologico", Valor: idPatologico },
                { Nombre: "@NoPatologico", Valor: idNoPatologico },
                { Nombre: "@Gineco", Valor: idGineco },
                { Nombre: "@Incapacidad", Valor: idIncapacidad },
                { Nombre: "@Exploracion", Valor: idExploracion },
                { Nombre: "@Estudios", Valor: idEstudios },
                { Nombre: "@Conclusion", Valor: idConclusion },
                { Nombre: "@FechaEvaluacion", Valor: today },
                // { Nombre: "@Tipo",            Valor: null },
            ];
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsEvaluacion);
            try {
                const mat = String(matricula !== null && matricula !== void 0 ? matricula : "").trim().replace(/[^a-zA-Z0-9]/g, "");
                if (mat) {
                    const borradorPath = path.join(__dirname, "..", "data", "borradores", `${mat}.json`);
                    if (fs.existsSync(borradorPath))
                        fs.unlinkSync(borradorPath);
                }
            }
            catch { /* no crítico */ }
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
    const BORRADORES_DIR = path.join(__dirname, "..", "data", "borradores");
    const GuardarBorrador = async (req, res) => {
        try {
            const { matricula, pacienteId, datos } = req.body;
            if (!matricula)
                return res.status(400).json({ ok: false, message: "Matrícula requerida" });
            const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
            fs.mkdirSync(BORRADORES_DIR, { recursive: true });
            const filePath = path.join(BORRADORES_DIR, `${mat}.json`);
            fs.writeFileSync(filePath, JSON.stringify({
                datos,
                pacienteId: pacienteId !== null && pacienteId !== void 0 ? pacienteId : null,
                fechaGuardado: new Date().toISOString(),
            }), "utf-8");
            return res.json({ ok: true });
        }
        catch (error) {
            return res.status(500).json({ ok: false, message: error.message });
        }
    };
    const ObtenerBorrador = async (req, res) => {
        try {
            const { matricula } = req.body;
            if (!matricula)
                return res.status(400).json({ ok: false, message: "Matrícula requerida" });
            const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
            const filePath = path.join(BORRADORES_DIR, `${mat}.json`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ ok: false });
            }
            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            return res.json({ ok: true, data: content });
        }
        catch (error) {
            return res.status(500).json({ ok: false, message: error.message });
        }
    };
    const EliminarBorrador = async (req, res) => {
        try {
            const { matricula } = req.body;
            if (!matricula)
                return res.status(400).json({ ok: false, message: "Matrícula requerida" });
            const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
            const filePath = path.join(BORRADORES_DIR, `${mat}.json`);
            if (fs.existsSync(filePath))
                fs.unlinkSync(filePath);
            return res.json({ ok: true });
        }
        catch (error) {
            return res.status(500).json({ ok: false, message: error.message });
        }
    };
    // ─────────────────────────────────────────────────────────────────────────────
    const ObtenerEvaluacion = async (req, res) => {
        try {
            const { matricula, pacienteId } = req.params;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Matricula", Valor: String(matricula !== null && matricula !== void 0 ? matricula : '') },
                { Nombre: "@PacienteId", Valor: String(pacienteId !== null && pacienteId !== void 0 ? pacienteId : '') },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            if (!result || result.length === 0) {
                return res.status(404).json({ message: "Sin evaluación previa." });
            }
            return res.json(result[0]);
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                message: error.message,
            });
        }
    };
    const GenerarHistoriaClinica = async (req, res) => {
        var _a, _b;
        try {
            const { evaluacionId, especialidad } = req.body;
            if (!evaluacionId)
                return res.status(400).json({ message: "Se requiere evaluacionId." });
            const params = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@Id", Valor: String(evaluacionId !== null && evaluacionId !== void 0 ? evaluacionId : "") },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            if (!result || result.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: "Evaluación no encontrada."
                });
            }
            const row = result[0];
            const jp = (v) => {
                try {
                    return v ? JSON.parse(v) : null;
                }
                catch {
                    return null;
                }
            };
            const av = jp(row.AgudezaVisual) || {};
            const vacunas = {
                ...(jp(row.EsquemaVacuna) || {}),
                ...(jp(row.EsquemaCovid) || {})
            };
            const diags = jp(row.Diagnosticos) || [];
            const recoms = jp(row.Recomendaciones) || [];
            const data = {
                matricula: row.MatriculaPac,
                nombre: row.NombrePaciente || '',
                fechaEval: row.FechaEvaluacion,
                edad: '',
                genero: row.Genero || '',
                estadoCivil: row.EstadoCivil || '',
                fechaNacimiento: row.FechaNacimiento || '',
                escolaridad: row.Escolaridad || '',
                noImss: row.NoIMSS || '',
                especialidad: especialidad || '',
                puestoAspira: '',
                contactoEmergencia: row.Contacto || '',
                numeroContacto: row.NumContacto || '',
                edadInicioLaboral: row.EdadInicio,
                antLaborales: jp(row.AntecedenteLaboral) || [],
                agentes: jp(row.ExposicionAgentes) || {},
                antFamiliares: (() => {
                    const af = jp(row.AntecedenteFamiliar) || {};
                    const siNo = (val) => val === true ? 'SI' : '';
                    const enfs = ['Tuberculosis', 'Sífilis', 'Hipertensión', 'Diabetes', 'Cardiópatas', 'Epilépticos', 'Oncológicos', 'Malformaciones congénitas', 'Otros'];
                    return enfs.map(e => {
                        var _a, _b, _c, _d, _e;
                        return ({
                            antecedente: e,
                            abuelos: siNo((_a = af[e]) === null || _a === void 0 ? void 0 : _a.abuelos),
                            padres: siNo((_b = af[e]) === null || _b === void 0 ? void 0 : _b.padres),
                            hermanos: siNo((_c = af[e]) === null || _c === void 0 ? void 0 : _c.hermanos),
                            hijos: siNo((_d = af[e]) === null || _d === void 0 ? void 0 : _d.hijos),
                            otros: siNo((_e = af[e]) === null || _e === void 0 ? void 0 : _e.otros),
                        });
                    });
                })(),
                antPatologicos: jp(row.AntecedentePatologico) || {},
                vacunas,
                antNoPatologico: jp(row.AntecedenteNoPatologico) || {},
                gineco: {
                    menarquia: row.Menarquia,
                    ritmo: row.Ritmo,
                    papanicolau: row.Papanicolau,
                    fum: row.FUM,
                    dismenorrea: row.Dismenorrea,
                    incapacitante: row.Incapacitante,
                    diasDismenorrea: row.Dias,
                    gestas: row.Gestas,
                    partos: row.Partos,
                    cesareas: row.Cesareas,
                    abortos: row.Abortos,
                    mamas: row.Mamas,
                    usg: row.USG,
                    mastografia: row.Mastografia,
                    birads: row.BiRads,
                },
                incapacidadRiesgo: row.RiesgoTrabajo,
                incapacidadEG: row.EnfermedadGral,
                manoDominante: row.ManoDominante,
                incapacidadValuacion: row.Valuacion,
                incapacidadComentario: row.Comentario,
                enfermedadActual: row.PadeceEnfermedad,
                vitalSigns: jp(row.SignosVitales) || {},
                expCabeza: jp(row.Cabeza) || {},
                expOidos: jp(row.Oidos) || {},
                expOjos: jp(row.Ojos) || {},
                agudezaOD: av.OD || {},
                agudezaOI: av.OI || {},
                usaLentes: (_a = av.usaLentes) !== null && _a !== void 0 ? _a : null,
                expBoca: jp(row.Boca) || {},
                expNariz: jp(row.Nariz) || {},
                expCuello: jp(row.Cuello) || {},
                expPrecordial: jp(row.AreaPrecordial) || {},
                expMTor: jp(row.MiembrosToracicos) || {},
                expMPel: jp(row.MiembrosPelvicos) || {},
                expAbdomen: jp(row.Abdomen) || {},
                expGenitales: jp(row.Genitales) || {},
                expPiel: jp(row.PielAnexos) || {},
                expColCervical: jp(row.ColumnaCervicalDorsal) || {},
                expColLumbar: jp(row.ColumnaLumbar) || {},
                labs: jp(row.Laboratorio) || {},
                expRadiografia: jp(row.Radiografia) || {},
                expHallazgos: jp(row.Hallazgos) || {},
                expGabinete: jp(row.Gabinete) || {},
                conclusiones: {
                    diagnostico1: diags[0] || '',
                    diagnostico2: diags[1] || '',
                    diagnostico3: diags[2] || '',
                    diagnostico4: diags[3] || '',
                    recomendacion1: recoms[0] || '',
                    recomendacion2: recoms[1] || '',
                    recomendacion3: recoms[2] || '',
                    resultado: row.GradoSalud || '',
                    gradoSalud: row.GradoSalud || '',
                    observaciones: row.Observaciones || '',
                },
            };
            const docxBuffer = await generarHistoriaClinicaDocx(data);
            const mat = String(row.MatriculaPac || row.PacienteId).trim();
            const ahora = new Date();
            const fechaHora = ahora.toLocaleString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                .replace(/\//g, "-").replace(", ", "_").replace(/:/g, "-");
            const baseName = `Historia_Clinica_${mat}_${fechaHora}`;
            // Convertir DOCX a PDF via servicio interno y guardar en documentos
            try {
                const axios = require("axios");
                const FormData = require("form-data");
                const form = new FormData();
                form.append("documentName", baseName);
                form.append("file", docxBuffer, {
                    filename: `${baseName}.docx`,
                    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });
                const pdfRes = await axios.post("http://10.133.18.28:1616/utils/docx_to_pdf", form, { headers: form.getHeaders(), responseType: "arraybuffer", timeout: 30000 });
                const pdfBuffer = Buffer.from(pdfRes.data);
                const pdfName = `${baseName}.pdf`;
                const uploadsDir = path.join(__dirname, "..", "uploads", mat);
                const filePath = path.join(uploadsDir, pdfName);
                // Guardar PDF en disco
                if (!fs.existsSync(uploadsDir))
                    fs.mkdirSync(uploadsDir, { recursive: true });
                fs.writeFileSync(filePath, pdfBuffer);
                // Obtener IdPaciente
                const paramsDoc = [
                    { Nombre: "@Case", Valor: "0" },
                    { Nombre: "@Matricula", Valor: mat },
                    { Nombre: "@IdDocumento", Valor: "" },
                    { Nombre: "@IdModifica", Valor: "" },
                ];
                const paciente = await executeConnection("[TNGCORE].[dbo].[SCII_Control_Documentos]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsDoc);
                if (!(paciente === null || paciente === void 0 ? void 0 : paciente.length) || !paciente[0].IdPaciente) {
                    return res.status(404).json({ ok: false, message: "Paciente no encontrado al guardar el documento." });
                }
                // Registrar en BD
                const fileBase64 = pdfBuffer.toString("base64");
                const paramsSubir = [
                    { Nombre: "@PacienteId", Valor: (_b = String(paciente[0].IdPaciente)) !== null && _b !== void 0 ? _b : '' },
                    { Nombre: "@Matricula", Valor: mat },
                    { Nombre: "@NombrePDF", Valor: pdfName },
                    { Nombre: "@TipoDoc", Valor: "2" },
                    { Nombre: "@Direccion", Valor: filePath.toUpperCase() },
                    { Nombre: "@FileBytes", Valor: fileBase64 },
                    { Nombre: "@Estado", Valor: "1" },
                ];
                await executeConnection("[TNGCORE].[dbo].[SCII_Subir_Documentos]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, paramsSubir);
                return res.json({ ok: true, matricula: mat, archivo: pdfName });
            }
            catch (pdfError) {
                return res.status(502).json({ ok: false, message: "Error al generar o guardar el PDF.", detail: pdfError === null || pdfError === void 0 ? void 0 : pdfError.message });
            }
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
    return { InformacionPerfil, AgregarEvaluacion, ObtenerEvaluacion, GenerarHistoriaClinica, GuardarBorrador, ObtenerBorrador, EliminarBorrador };
}
