// Generador de síntesis clínica estructurada (sección 34 del documento y mejora
// solicitada por el usuario). NO usa IA/LLM: es una plantilla determinística
// construida a partir de los mismos agregados ya calculados en analytics.ts, para
// la misma cohorte filtrada que el resto del dashboard (principio de sección 34:
// "El resumen deberá corresponder exactamente a la población que el médico esté
// visualizando"). Un futuro analizador inteligente (Fase 5) puede sustituir este
// módulo sin cambiar el resto del dashboard.

import { RegistroValidado } from "./types";
import { estadisticasIndicador, obtenerValor, calcularCoberturaCalidad } from "./analytics";
import { clasificarIMCSimplificado, clasificarPresion, clasificarRiesgo } from "./clinicalRules";

export interface ResumenMedico {
  estadoNutricional: string;
  perfilCardiovascular: string;
  coberturaMetabolica: string;
  recomendacionEjecutiva: string;
  poblacion: number;
}

function pct(parte: number, total: number): number {
  return total ? Number(((parte / total) * 100).toFixed(1)) : 0;
}

export function generarResumenMedico(estadoActual: RegistroValidado[]): ResumenMedico | null {
  const poblacion = estadoActual.length;
  if (poblacion === 0) return null;

  // --- Estado nutricional -------------------------------------------------
  const conImc = estadoActual.filter((r) => r.IMC.estado !== "FALTANTE");
  const normopeso = conImc.filter((r) => clasificarIMCSimplificado(r.IMC.usado) === "Normopeso").length;
  const sobrepesoObesidad = conImc.filter((r) => {
    const c = clasificarIMCSimplificado(r.IMC.usado);
    return c === "Sobrepeso" || c === "Obesidad";
  }).length;
  const imcStats = estadisticasIndicador(estadoActual, "IMC");

  const estadoNutricional = conImc.length === 0
    ? "No hay suficientes datos de IMC en la población seleccionada para describir el estado nutricional."
    : `De ${conImc.length} personas con IMC registrado (${pct(conImc.length, poblacion)}% de la población seleccionada), ${pct(normopeso, conImc.length)}% se encuentra en normopeso y ${pct(sobrepesoObesidad, conImc.length)}% presenta sobrepeso u obesidad. El IMC promedio es de ${imcStats.media ?? "sin dato"} kg/m² (mediana ${imcStats.mediana ?? "sin dato"}).`;

  // --- Perfil cardiovascular ------------------------------------------------
  const conPresion = estadoActual.filter((r) => obtenerValor(r, "Sistolica") != null && obtenerValor(r, "Diastolica") != null);
  const elevados = conPresion.filter((r) => {
    const nivel = clasificarPresion(obtenerValor(r, "Sistolica"), obtenerValor(r, "Diastolica")).nivel;
    return nivel === "alto" || nivel === "critico";
  }).length;
  const sistolicaStats = estadisticasIndicador(estadoActual, "Sistolica");
  const diastolicaStats = estadisticasIndicador(estadoActual, "Diastolica");

  const perfilCardiovascular = conPresion.length === 0
    ? "No hay suficientes datos de presión arterial en la población seleccionada para describir el perfil cardiovascular."
    : `De ${conPresion.length} personas con presión arterial completa (${pct(conPresion.length, poblacion)}%), ${pct(elevados, conPresion.length)}% se encuentra en hipertensión etapa 1 o superior. Presión promedio: ${sistolicaStats.media ?? "s/d"}/${diastolicaStats.media ?? "s/d"} mmHg.`;

  // --- Cobertura metabólica -------------------------------------------------
  const glucosa = calcularCoberturaCalidad(estadoActual, "Glucosa");
  const colesterol = calcularCoberturaCalidad(estadoActual, "Colesterol");
  const trigliceridos = calcularCoberturaCalidad(estadoActual, "Trigliceridos");
  const indicadoresMetabolicos = [
    { label: "Glucosa", ...glucosa },
    { label: "Colesterol", ...colesterol },
    { label: "Triglicéridos", ...trigliceridos },
  ];
  const peorCobertura = [...indicadoresMetabolicos].sort((a, b) => a.coberturaPct - b.coberturaPct)[0];

  const coberturaMetabolica =
    `Cobertura de datos metabólicos: Glucosa ${glucosa.coberturaPct}%, Colesterol ${colesterol.coberturaPct}%, Triglicéridos ${trigliceridos.coberturaPct}% (sobre ${poblacion} personas). ` +
    `${peorCobertura.label} es el indicador con menor cobertura (${peorCobertura.presentes}/${poblacion} registros disponibles) — cualquier lectura basada en este indicador debe interpretarse con cautela.`;

  // --- Recomendación ejecutiva -----------------------------------------------
  const conRiesgo = estadoActual.filter((r) => r.Riesgo != null);
  const riesgoElevado = conRiesgo.filter((r) => {
    const nivel = clasificarRiesgo(r.Riesgo).nivel;
    return nivel === "alto" || nivel === "critico";
  }).length;
  const pctRiesgoElevado = pct(riesgoElevado, conRiesgo.length || 1);

  let recomendacionEjecutiva: string;
  if (conRiesgo.length === 0) {
    recomendacionEjecutiva = "No hay clasificación de riesgo disponible para la población seleccionada; se recomienda priorizar la captura de este dato antes de emitir una recomendación ejecutiva.";
  } else if (pctRiesgoElevado >= 30) {
    recomendacionEjecutiva = `${pctRiesgoElevado}% de la población con riesgo clasificado (${riesgoElevado}/${conRiesgo.length}) presenta riesgo moderado o alto. Se recomienda priorizar seguimiento clínico e intervención en los grupos y departamentos con mayor concentración de riesgo elevado (ver Matriz de riesgo).`;
  } else if (pctRiesgoElevado >= 10) {
    recomendacionEjecutiva = `${pctRiesgoElevado}% de la población con riesgo clasificado (${riesgoElevado}/${conRiesgo.length}) presenta riesgo moderado o alto. Se recomienda mantener el seguimiento periódico y reforzar la cobertura de datos en los indicadores con menor calidad.`;
  } else {
    recomendacionEjecutiva = `Solo ${pctRiesgoElevado}% de la población con riesgo clasificado (${riesgoElevado}/${conRiesgo.length}) presenta riesgo moderado o alto. El perfil general es favorable; se recomienda mantener la periodicidad de evaluaciones para sostener esta tendencia.`;
  }

  return { estadoNutricional, perfilCardiovascular, coberturaMetabolica, recomendacionEjecutiva, poblacion };
}
