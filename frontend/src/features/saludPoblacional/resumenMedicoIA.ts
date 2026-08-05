// Construye el payload ESTRUCTURADO por departamento para el "Resumen médico (IA)".
//
// Principio de diseño: todas las CIFRAS se calculan aquí, de forma determinista,
// reutilizando exactamente las mismas funciones de analytics.ts que alimentan el
// resto del dashboard. La IA nunca hace aritmética — solo recibe estos números ya
// correctos y redacta los `hallazgos` (texto corto). Esto evita alucinaciones de
// cifras y mantiene consistencia con lo que el médico ve en las demás pestañas.

import { RegistroValidado } from "./types";
import { estadisticasIndicador, calcularCoberturaCalidad, calcularEdad, construirEvolucionHistorica, IndicadorClave } from "./analytics";
import { clasificarGrupoEtario, clasificarRiesgo, clasificarIMCSimplificado, CATEGORIAS_IMC_OMS } from "./clinicalRules";

// Un departamento con menos personas que esto no se reporta como card individual
// (proporciones con N muy chico son ruido, no señal).
const MIN_POBLACION_DEPTO = 3;
// Mínimo de observaciones históricas para afirmar una tendencia temporal.
const MIN_N_TENDENCIA = 8;
// Umbral de "concentración destacada": a partir de qué % de participación en un
// total poblacional vale la pena resaltarlo como badge en la card.
export const UMBRAL_PARTICIPACION_DESTACADA = 25;

export type NivelAlerta = "bajo" | "moderado" | "alto";

export interface ComparativoIndicador {
  valor: number | null;
  promedioGeneral: number | null;
  diferenciaPct: number | null;
}

export interface Tendencia {
  direccion: "alza" | "baja" | "estable";
  cambioPct: number;
  n: number;
}

export interface DepartamentoResumen {
  nombre: string;
  poblacion: number;
  nivelAlerta: NivelAlerta;
  hallazgos: string[]; // se llenan con la respuesta de la IA (vacío hasta entonces)
  vsPromedio: {
    edad: ComparativoIndicador;
    imc: ComparativoIndicador;
    sistolica: ComparativoIndicador;
    glucosa: ComparativoIndicador;
    colesterol: ComparativoIndicador;
    trigliceridos: ComparativoIndicador;
    riesgoAltoPct: ComparativoIndicador;
  };
  participacionPoblacional: {
    riesgoAltoPct: number | null;
    obesidadPct: number | null;
  };
  tendencias: Partial<Record<"imc" | "sistolica" | "glucosa" | "colesterol" | "trigliceridos", Tendencia>>;
  distribucionRiesgo: { sano: number; moderado: number; alto: number };
  distribucionImc: { bajoPeso: number; normopeso: number; sobrepeso: number; obesidad: number };
  coberturaDatos: { imcPct: number; presionPct: number; glucosaPct: number; colesterolPct: number; trigliceridosPct: number };
}

export interface ResumenIAPayload {
  poblacionTotal: number;
  promedioGeneral: {
    edad: number | null;
    imc: number | null;
    sistolica: number | null;
    glucosa: number | null;
    colesterol: number | null;
    trigliceridos: number | null;
    riesgoAltoPct: number | null;
  };
  departamentos: DepartamentoResumen[];
}

function comparativo(valor: number | null, promedioGeneral: number | null): ComparativoIndicador {
  const diferenciaPct = valor != null && promedioGeneral != null && promedioGeneral !== 0
    ? Number((((valor - promedioGeneral) / promedioGeneral) * 100).toFixed(1))
    : null;
  return { valor, promedioGeneral, diferenciaPct };
}

function riesgoAltoPctDe(filas: RegistroValidado[]): number | null {
  const conRiesgo = filas.filter((r) => r.Riesgo != null);
  if (conRiesgo.length === 0) return null;
  const altos = conRiesgo.filter((r) => ["alto", "critico"].includes(clasificarRiesgo(r.Riesgo).nivel)).length;
  return Number(((altos / conRiesgo.length) * 100).toFixed(1));
}

function nivelAlertaDe(riesgoAltoPct: number | null): NivelAlerta {
  if (riesgoAltoPct == null) return "bajo";
  if (riesgoAltoPct >= 50) return "alto";
  if (riesgoAltoPct >= 25) return "moderado";
  return "bajo";
}

// Dirección de un indicador en el tiempo para un departamento, usando el historial
// completo (no solo el estado actual). Compara el primer y el último periodo con
// datos válidos; exige un mínimo de observaciones para considerarse confiable.
function tendenciaDe(historicoDepto: RegistroValidado[], campo: IndicadorClave): Tendencia | null {
  const serie = construirEvolucionHistorica(historicoDepto, campo, "promedio", "anio").filter((p) => p.valor != null);
  if (serie.length < 2) return null;

  const n = serie.reduce((acc, p) => acc + p.n, 0);
  if (n < MIN_N_TENDENCIA) return null;

  const inicio = serie[0].valor as number;
  const fin = serie[serie.length - 1].valor as number;
  if (inicio === 0) return null;

  const cambioPct = Number((((fin - inicio) / inicio) * 100).toFixed(1));
  const direccion = cambioPct > 5 ? "alza" : cambioPct < -5 ? "baja" : "estable";

  return { direccion, cambioPct, n };
}

export function construirPayloadResumenIA(estadoActual: RegistroValidado[], historico: RegistroValidado[]): ResumenIAPayload {
  const poblacionTotal = estadoActual.length;

  // --- Promedios y totales de referencia de TODA la población filtrada ---------
  const edades = estadoActual.map((r) => calcularEdad(r.FechaNacimiento.original, r.Fecha.original)).filter((e): e is number => e != null);
  const promedioGeneral = {
    edad: edades.length ? Number((edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1)) : null,
    imc: estadisticasIndicador(estadoActual, "IMC").media,
    sistolica: estadisticasIndicador(estadoActual, "Sistolica").media,
    glucosa: estadisticasIndicador(estadoActual, "Glucosa").media,
    colesterol: estadisticasIndicador(estadoActual, "Colesterol").media,
    trigliceridos: estadisticasIndicador(estadoActual, "Trigliceridos").media,
    riesgoAltoPct: riesgoAltoPctDe(estadoActual),
  };

  const totalRiesgoAltoPoblacion = estadoActual.filter((r) => ["alto", "critico"].includes(clasificarRiesgo(r.Riesgo).nivel)).length;
  const totalObesidadPoblacion = estadoActual.filter((r) => r.IMC.estado !== "FALTANTE" && clasificarIMCSimplificado(r.IMC.usado) === "Obesidad").length;

  // --- Agrupar por departamento --------------------------------------------------
  const porDepto = new Map<string, RegistroValidado[]>();
  estadoActual.forEach((r) => {
    if (!r.Depto_nombre) return;
    const arr = porDepto.get(r.Depto_nombre) ?? [];
    arr.push(r);
    porDepto.set(r.Depto_nombre, arr);
  });

  const departamentos: DepartamentoResumen[] = Array.from(porDepto.entries())
    .filter(([, filas]) => filas.length >= MIN_POBLACION_DEPTO)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([nombre, filas]) => {
      const edadesDepto = filas.map((r) => calcularEdad(r.FechaNacimiento.original, r.Fecha.original)).filter((e): e is number => e != null);
      const edadPromedioDepto = edadesDepto.length ? Number((edadesDepto.reduce((a, b) => a + b, 0) / edadesDepto.length).toFixed(1)) : null;

      const riesgoAltoPctDepto = riesgoAltoPctDe(filas);
      const riesgoAltoCountDepto = filas.filter((r) => ["alto", "critico"].includes(clasificarRiesgo(r.Riesgo).nivel)).length;
      const obesidadCountDepto = filas.filter((r) => r.IMC.estado !== "FALTANTE" && clasificarIMCSimplificado(r.IMC.usado) === "Obesidad").length;

      const distribucionRiesgo = { sano: 0, moderado: 0, alto: 0 };
      filas.forEach((r) => {
        const nivel = clasificarRiesgo(r.Riesgo).nivel;
        if (nivel === "normal") distribucionRiesgo.sano++;
        else if (nivel === "leve") distribucionRiesgo.moderado++;
        else if (nivel === "alto" || nivel === "critico") distribucionRiesgo.alto++;
      });

      const distribucionImc = { bajoPeso: 0, normopeso: 0, sobrepeso: 0, obesidad: 0 };
      filas.forEach((r) => {
        if (r.IMC.estado === "FALTANTE") return;
        const categoria = clasificarIMCSimplificado(r.IMC.usado);
        if (categoria === "Bajo peso") distribucionImc.bajoPeso++;
        else if (categoria === "Normopeso") distribucionImc.normopeso++;
        else if (categoria === "Sobrepeso") distribucionImc.sobrepeso++;
        else if (categoria === "Obesidad") distribucionImc.obesidad++;
      });

      const historicoDepto = historico.filter((r) => r.Depto_nombre === nombre);

      return {
        nombre,
        poblacion: filas.length,
        nivelAlerta: nivelAlertaDe(riesgoAltoPctDepto),
        hallazgos: [],
        vsPromedio: {
          edad: comparativo(edadPromedioDepto, promedioGeneral.edad),
          imc: comparativo(estadisticasIndicador(filas, "IMC").media, promedioGeneral.imc),
          sistolica: comparativo(estadisticasIndicador(filas, "Sistolica").media, promedioGeneral.sistolica),
          glucosa: comparativo(estadisticasIndicador(filas, "Glucosa").media, promedioGeneral.glucosa),
          colesterol: comparativo(estadisticasIndicador(filas, "Colesterol").media, promedioGeneral.colesterol),
          trigliceridos: comparativo(estadisticasIndicador(filas, "Trigliceridos").media, promedioGeneral.trigliceridos),
          riesgoAltoPct: comparativo(riesgoAltoPctDepto, promedioGeneral.riesgoAltoPct),
        },
        participacionPoblacional: {
          riesgoAltoPct: totalRiesgoAltoPoblacion ? Number(((riesgoAltoCountDepto / totalRiesgoAltoPoblacion) * 100).toFixed(1)) : null,
          obesidadPct: totalObesidadPoblacion ? Number(((obesidadCountDepto / totalObesidadPoblacion) * 100).toFixed(1)) : null,
        },
        tendencias: {
          imc: tendenciaDe(historicoDepto, "IMC") ?? undefined,
          sistolica: tendenciaDe(historicoDepto, "Sistolica") ?? undefined,
          glucosa: tendenciaDe(historicoDepto, "Glucosa") ?? undefined,
          colesterol: tendenciaDe(historicoDepto, "Colesterol") ?? undefined,
          trigliceridos: tendenciaDe(historicoDepto, "Trigliceridos") ?? undefined,
        },
        distribucionRiesgo,
        distribucionImc,
        coberturaDatos: {
          imcPct: calcularCoberturaCalidad(filas, "IMC").coberturaPct,
          presionPct: calcularCoberturaCalidad(filas, "Sistolica").coberturaPct,
          glucosaPct: calcularCoberturaCalidad(filas, "Glucosa").coberturaPct,
          colesterolPct: calcularCoberturaCalidad(filas, "Colesterol").coberturaPct,
          trigliceridosPct: calcularCoberturaCalidad(filas, "Trigliceridos").coberturaPct,
        },
      };
    });

  return { poblacionTotal, promedioGeneral, departamentos };
}

// Solo lo que se le manda a la IA: los números, sin el array `hallazgos` (vacío,
// lo llena la respuesta) — así el payload de salida es más chico y explícito sobre
// qué es lo único que la IA debe producir.
// Solo se manda la participación poblacional cuando supera el umbral de "destacada"
// (constante compartida con la UI) — así la IA nunca decide ese criterio por su
// cuenta, ya viene filtrado.
function participacionDestacada(pct: number | null): number | null {
  return pct != null && pct >= UMBRAL_PARTICIPACION_DESTACADA ? pct : null;
}

export function payloadParaIA(resumen: ResumenIAPayload) {
  return {
    poblacionTotal: resumen.poblacionTotal,
    promedioGeneral: resumen.promedioGeneral,
    departamentos: resumen.departamentos.map(({ hallazgos, participacionPoblacional, ...resto }) => ({
      ...resto,
      participacionPoblacional: {
        riesgoAltoPct: participacionDestacada(participacionPoblacional.riesgoAltoPct),
        obesidadPct: participacionDestacada(participacionPoblacional.obesidadPct),
      },
    })),
  };
}
