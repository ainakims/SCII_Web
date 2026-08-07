// Clasificación de las "Métricas destacadas" (último signo vital), usando los
// mismos umbrales NOM ya documentados para este análisis (ver memoria de
// proyecto): NOM-030-SSA2-2009 (TA), banda FC estándar, OMS para IMC. Separado
// de saludPoblacional/clinicalRules.ts porque es un contrato de datos distinto.

export interface EstiloBadge {
  label: string;
  clase: string;
}

const ESTILO_NORMAL = "bg-green-50 text-green-700 border border-green-200";
const ESTILO_MEDIO = "bg-amber-50 text-amber-700 border border-amber-200";
const ESTILO_ALTO = "bg-red-50 text-red-600 border border-red-200";
const ESTILO_SIN_DATO = "bg-gray-50 text-gray-400 border border-gray-200";

export function clasificarPresion(sistolica: number | null, diastolica: number | null): EstiloBadge {
  if (sistolica == null || diastolica == null) return { label: "Sin dato", clase: ESTILO_SIN_DATO };
  if (sistolica >= 160 || diastolica >= 100) return { label: "Alta", clase: ESTILO_ALTO };
  if (sistolica >= 130 || diastolica >= 85) return { label: "Elevada", clase: ESTILO_MEDIO };
  return { label: "Normal", clase: ESTILO_NORMAL };
}

export function clasificarFrecuenciaCardiaca(fc: number | null): EstiloBadge {
  if (fc == null) return { label: "Sin dato", clase: ESTILO_SIN_DATO };
  if (fc > 100) return { label: "Taquicardia", clase: ESTILO_MEDIO };
  if (fc < 60) return { label: "Bradicardia", clase: ESTILO_MEDIO };
  return { label: "Normal", clase: ESTILO_NORMAL };
}

export function clasificarImc(imc: number | null): EstiloBadge {
  if (imc == null) return { label: "Sin dato", clase: ESTILO_SIN_DATO };
  if (imc < 18.5) return { label: "Bajo peso", clase: ESTILO_MEDIO };
  if (imc < 25) return { label: "Normal", clase: ESTILO_NORMAL };
  if (imc < 30) return { label: "Sobrepeso", clase: ESTILO_MEDIO };
  return { label: "Obesidad", clase: ESTILO_ALTO };
}
