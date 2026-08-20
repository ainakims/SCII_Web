"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaludPoblacionalController = SaludPoblacionalController;
const params_web_service_1 = require("../interfaces/params_web_service");
const poblacionValidacion_service_1 = require("../services/poblacionValidacion.service");
const iaResumenPoblacional_service_1 = require("../services/iaResumenPoblacional.service");
const SQL_INDICADORES = "[TNGCORE].[dbo].[SCII_Valores_Indicadores]";
function SaludPoblacionalController(db) {
    const { executeConnection } = db;
    // @Case=2 (catálogo del empleado) se reutiliza tanto para combinar con
    // @Case=1 (valores) como con @Case=3 (consultas) — en ambos casos sirve para
    // resolver Departamento/FechaNacimiento/etc. a partir de la Matricula.
    const obtenerCatalogoEmpleados = async (activo) => {
        const filasCatalogo = await executeConnection(SQL_INDICADORES, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
            { Nombre: "@Case", Valor: "2" },
            { Nombre: "@Activo", Valor: activo },
        ]);
        const catalogoPorMatricula = new Map();
        (Array.isArray(filasCatalogo) ? filasCatalogo : []).forEach((c) => {
            var _a;
            const clave = String((_a = c.Empl_matricula) !== null && _a !== void 0 ? _a : "").trim().toUpperCase();
            if (clave)
                catalogoPorMatricula.set(clave, c);
        });
        return catalogoPorMatricula;
    };
    // SCII_Valores_Indicadores reparte en @Case=1 (valores) y @Case=2 (catálogo
    // del empleado) lo que el proc anterior (SCII_Valores_Indicadores_2)
    // regresaba en un solo SELECT. Se piden ambos y se combinan aquí por
    // Matricula para reconstruir el shape que espera RawIndicadorRow /
    // normalizarPoblacion, sin tocar el resto del pipeline de validación.
    const obtenerIndicadoresCombinados = async (activo) => {
        const [filasValores, catalogoPorMatricula] = await Promise.all([
            executeConnection(SQL_INDICADORES, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Activo", Valor: activo },
            ]),
            obtenerCatalogoEmpleados(activo),
        ]);
        // El proc anterior armaba esto con un INNER JOIN contra el catálogo de
        // empleados ya filtrado (sin matrículas de prueba/malformadas): una lectura
        // de @Case=1 que no tenga empleado correspondiente en @Case=2 es "ruido"
        // (matrícula de prueba, dato huérfano, etc.) y se descarta, igual que antes.
        return (Array.isArray(filasValores) ? filasValores : [])
            .reduce((acc, v) => {
            var _a;
            const catalogo = catalogoPorMatricula.get(String((_a = v.Matricula) !== null && _a !== void 0 ? _a : "").trim().toUpperCase());
            if (!catalogo)
                return acc;
            acc.push({
                Id: v.Id,
                Matricula: v.Matricula,
                Sistolica: v.Sistolica,
                Diastolica: v.Diastolica,
                Glucosa: v.Glucosa,
                Colesterol: v.Colesterol,
                Trigliceridos: v.Trigliceridos,
                Peso: v.Peso,
                Altura: v.Altura,
                PA: v.PA,
                IMC: v.IMC,
                ICT: v.ICT,
                Riesgo: v.Riesgo,
                Fecha: v.Fecha,
                FechaNacimiento: catalogo.FechaNacimiento,
                Categoria_desc: catalogo.Categoria_desc,
                Departamento: catalogo.Departamento,
                Depto_Series: catalogo.Depto_Series,
                Especialidad: catalogo.Especialidad,
                Sexo: catalogo.Sexo,
            });
            return acc;
        }, []);
    };
    // @Case=3: consultas puntuales de toda la plantilla (según @Activo), sin
    // filtrar por matrícula — mismo shape de columnas que el Caso 3 individual
    // de SCII_Valores_Indicadores_Por_Empleado (ver RawConsultaRow). El
    // departamento no viene en esta fila, se resuelve con el catálogo @Case=2,
    // igual que Departamento en obtenerIndicadoresCombinados; una consulta sin
    // empleado correspondiente en el catálogo se descarta (mismo criterio de
    // "ruido" que @Case=1).
    const obtenerConsultasPoblacionales = async (activo) => {
        const [filasConsulta, catalogoPorMatricula] = await Promise.all([
            executeConnection(SQL_INDICADORES, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, [
                { Nombre: "@Case", Valor: "3" },
                { Nombre: "@Activo", Valor: activo },
            ]),
            obtenerCatalogoEmpleados(activo),
        ]);
        const filasValidas = (Array.isArray(filasConsulta) ? filasConsulta : []).filter((f) => { var _a; return catalogoPorMatricula.has(String((_a = f.Matricula) !== null && _a !== void 0 ? _a : "").trim().toUpperCase()); });
        const deptoPorMatricula = new Map();
        catalogoPorMatricula.forEach((c, matricula) => deptoPorMatricula.set(matricula, { depto: c.Departamento, deptoSeries: c.Depto_Series }));
        return (0, poblacionValidacion_service_1.normalizarConsultasPoblacion)(filasValidas, deptoPorMatricula);
    };
    // Regresa el historial completo de evaluaciones ya normalizado/validado
    // (capas RawData -> NormalizedData -> ValidatedData, sección 39 del documento).
    // El filtrado y la agregación estadística se hacen en el frontend, igual que
    // en el resto del sistema (ver Indicadores.tsx).
    const ObtenerDatos = async (req, res) => {
        try {
            const filas = await obtenerIndicadoresCombinados("1");
            const data = (0, poblacionValidacion_service_1.normalizarPoblacion)(filas);
            return res.json({
                ok: true,
                data,
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack,
            });
        }
    };
    // Historial de indicadores de UN empleado (Expediente > seleccionar matrícula),
    // en vez de traer toda la población y filtrar en el frontend. Mismo shape de
    // salida que ObtenerDatos (RegistroValidado[]) para reusar el resto del pipeline.
    // El SP no filtra por empleado en ningún @Case, así que se trae el censo
    // combinado (igual que ObtenerDatos) y se filtra aquí a una sola matrícula;
    // como no se sabe de antemano si es activo o reingreso, primero se busca en
    // activos y solo si no aparece se intenta en inactivos (mismo patrón que
    // /AnalisisIndividual/EvaluarInactivos).
    const ObtenerDatosPorEmpleado = async (req, res) => {
        try {
            const { matricula } = req.body;
            if (!matricula) {
                return res.status(400).json({ ok: false, message: "Se requiere la matrícula del empleado." });
            }
            const clave = String(matricula).trim().toUpperCase();
            const filtrarPorMatricula = (filas) => filas.filter((f) => { var _a; return String((_a = f.Matricula) !== null && _a !== void 0 ? _a : "").trim().toUpperCase() === clave; });
            let filas = filtrarPorMatricula(await obtenerIndicadoresCombinados("1"));
            if (filas.length === 0) {
                filas = filtrarPorMatricula(await obtenerIndicadoresCombinados("0"));
            }
            const data = (0, poblacionValidacion_service_1.normalizarPoblacion)(filas);
            return res.json({
                ok: true,
                data,
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack,
            });
        }
    };
    // Consultas puntuales (Caso 3) de toda la plantilla activa, ya asociadas a
    // su departamento — alimenta la matriz de protocolos poblacional del
    // Expediente (agregación por depto, se hace en el frontend, igual que el
    // resto del dashboard).
    const ObtenerConsultas = async (req, res) => {
        try {
            const data = await obtenerConsultasPoblacionales("1");
            return res.json({
                ok: true,
                data,
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack,
            });
        }
    };
    const ResumenIA = async (req, res) => {
        try {
            const { agregados } = req.body;
            if (!agregados || typeof agregados !== "object") {
                return res.status(400).json({ ok: false, message: "Se requiere el payload de agregados." });
            }
            const { resumenGeneral, departamentos, modelo } = await (0, iaResumenPoblacional_service_1.generarResumenMedicoIA)(agregados);
            return res.json({ ok: true, resumenGeneral, departamentos, modelo });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
            });
        }
    };
    return { ObtenerDatos, ObtenerDatosPorEmpleado, ObtenerConsultas, ResumenIA };
}
