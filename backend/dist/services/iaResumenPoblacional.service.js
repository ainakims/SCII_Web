"use strict";
// Genera el "Resumen médico (IA)" del Dashboard de Salud Poblacional.
//
// IMPORTANTE (privacidad y confiabilidad): a este servicio SOLO le llega un
// payload de agregados ya calculados en el frontend (promedios, conteos,
// porcentajes, comparativos por departamento) — nunca datos crudos por persona
// (nombre, matrícula, etc.). El modelo NUNCA calcula cifras: usa
// `response_format: json_schema` para forzar que solo regrese texto (hallazgos),
// nunca números — esos ya vienen correctos desde el frontend.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarResumenMedicoIA = generarResumenMedicoIA;
const axios_1 = __importDefault(require("axios"));
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const SYSTEM_PROMPT = `Eres un analista de salud poblacional/ocupacional apoyando a un equipo médico.
Recibirás un JSON con estadísticas ya calculadas y validadas (agregados, nunca datos de personas identificables): promedios generales, y por cada departamento su comparativo contra el promedio general, participación en el total de riesgo alto/obesidad (solo si es una concentración destacada), tendencias temporales (solo si son estadísticamente confiables), distribución de riesgo y de IMC, y cobertura de datos.

Tu tarea: para cada departamento del arreglo 'departamentos', escribe entre 1 y 4 "hallazgos" (frases cortas, una idea cada una, sin numerar) que resuman lo más relevante de SUS datos. Reglas:
1. Usa EXACTAMENTE los números que vienen en el JSON — no inventes, no redondees de más, no calcules algo que no esté ahí.
2. Si 'participacionPoblacional' trae un valor (no es null), es porque ya es una concentración destacada — menciónalo.
3. Si 'tendencias' trae una entrada, es porque ya es confiable estadísticamente — puedes mencionarla como tendencia.
4. Si 'coberturaDatos' de un indicador es baja (menor a 50), y vas a mencionar ese indicador, aclara que la cobertura es baja.
5. Si un departamento no tiene nada clínicamente relevante que resaltar (todo cerca del promedio, sin concentraciones ni tendencias), regresa un solo hallazgo neutro indicándolo — no inventes un problema.
6. NO diagnostiques personas específicas — esto es un análisis poblacional agregado.
7. Nombra el departamento tal cual viene en 'nombre', sin alterarlo.

También regresa 'resumenGeneral': 2-4 'hallazgosPrincipales' (patrones que cruzan varios departamentos) y 2-3 'recomendaciones' ejecutivas accionables.`;
const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        resumenGeneral: {
            type: "object",
            properties: {
                hallazgosPrincipales: { type: "array", items: { type: "string" } },
                recomendaciones: { type: "array", items: { type: "string" } },
            },
            required: ["hallazgosPrincipales", "recomendaciones"],
            additionalProperties: false,
        },
        departamentos: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    nombre: { type: "string" },
                    hallazgos: { type: "array", items: { type: "string" } },
                },
                required: ["nombre", "hallazgos"],
                additionalProperties: false,
            },
        },
    },
    required: ["resumenGeneral", "departamentos"],
    additionalProperties: false,
};
async function generarResumenMedicoIA(payloadAgregados) {
    var _a, _b, _c, _d;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY no está configurada en el servidor.");
    }
    const modelo = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const response = await axios_1.default.post(OPENAI_URL, {
        model: modelo,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(payloadAgregados) },
        ],
        temperature: 0.4,
        response_format: {
            type: "json_schema",
            json_schema: { name: "resumen_salud_poblacional", strict: true, schema: RESPONSE_SCHEMA },
        },
    }, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        timeout: 60000,
    });
    const contenido = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
    if (!contenido) {
        throw new Error("El proveedor de IA no regresó contenido.");
    }
    let parseado;
    try {
        parseado = JSON.parse(contenido);
    }
    catch {
        throw new Error("El proveedor de IA regresó una respuesta que no se pudo interpretar como JSON.");
    }
    return { ...parseado, modelo };
}
