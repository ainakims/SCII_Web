// Reglas de clasificación clínica del Dashboard de Salud Poblacional.
//
// Sección 33 del documento: "las categorías clínicas deberán estar separadas de la
// capa visual" y "no deberá contener valores clínicos codificados directamente [en
// la interfaz]". Este módulo centraliza esas bandas para que ningún componente las
// repita inline.
//
// IMPORTANTE: los umbrales usados son referencias clínicas estándar (OMS para IMC,
// ESH/ESC para presión arterial combinada —clasificarPresion—, AHA/ACC para el
// valor único de sistólica —clasificarSistolica—, ADA para glucosa en ayuno, ATP III
// para colesterol y triglicéridos). El documento (sección 44) deja explícitamente pendiente la
// confirmación de un protocolo clínico oficial por parte del equipo médico — estos
// valores deben tratarse como default editable, no como verdad definitiva.

export type Nivel = "bajo" | "normal" | "leve" | "alto" | "critico" | "sin_dato";

export interface Clasificacion {
  label: string;
  nivel: Nivel;
}

export const NIVEL_ESTILOS: Record<Nivel, string> = {
  bajo: "bg-linear-to-r from-sky-blue/20 to-sky-blue/5 text-sky-blue",
  normal: "bg-linear-to-r from-aqua-green/30 to-aqua-green/10 text-green-900",
  leve: "bg-linear-to-r from-sunray-yellow/30 to-sunray-yellow/10 text-yellow-600",
  alto: "bg-linear-to-r from-red-200 to-red-100/50 text-red-600",
  critico: "bg-linear-to-r from-red-400/40 to-red-300/20 text-red-800",
  sin_dato: "bg-linear-to-r from-gray-200 to-gray-100/50 text-gray-500",
};

export function clasificarIMC(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < 18.5) return { label: "Bajo peso", nivel: "bajo" };
  if (valor < 25) return { label: "Normal", nivel: "normal" };
  if (valor < 30) return { label: "Sobrepeso", nivel: "leve" };
  if (valor < 35) return { label: "Obesidad I", nivel: "alto" };
  if (valor < 40) return { label: "Obesidad II", nivel: "alto" };
  return { label: "Obesidad III", nivel: "critico" };
}

// export function clasificarPresion(sistolica: number | null, diastolica: number | null): Clasificacion {
//   if (sistolica == null || diastolica == null) return { label: "Sin dato", nivel: "sin_dato" };
//   if (sistolica >= 180 || diastolica >= 120) return { label: "Crisis", nivel: "critico" };
//   if ((sistolica >= 140) && (diastolica > 80 && diastolica >= 90)) return { label: "Etapa 2", nivel: "alto" };
//   if ((sistolica >= 130 && sistolica <= 139) && (diastolica > 80 && diastolica < 89)) return { label: "Etapa 1", nivel: "alto" };
//   if ((sistolica >= 120 && sistolica <= 129) && diastolica < 80) return { label: "Elevada", nivel: "alto" };
//   return { label: "Normal", nivel: "bajo" };
// }

export function clasificarPresion(sistolica: number | null, diastolica: number | null): Clasificacion {
  if (sistolica == null || diastolica == null) { return { label: "Sin dato", nivel: "sin_dato" }; }
  if (sistolica >= 180 || diastolica >= 120) { return { label: "Crisis", nivel: "critico" }; }
  if (sistolica >= 140 || diastolica >= 90) { return { label: "Etapa 2", nivel: "alto" }; }
  if ((sistolica >= 130 && sistolica <= 139) || (diastolica >= 80 && diastolica <= 89) ) { return { label: "Etapa 1", nivel: "alto" }; }
  if (sistolica >= 120 && sistolica <= 129 && diastolica < 80) { return { label: "Elevada", nivel: "alto" }; }
  return { label: "Normal", nivel: "bajo" };
}

export function clasificarSistolica(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor >= 180) return { label: "Crisis hipertensiva", nivel: "critico" };
  if (valor >= 140) return { label: "Hipertensión etapa 2", nivel: "alto" };
  if (valor >= 130) return { label: "Hipertensión etapa 1", nivel: "alto" };
  if (valor >= 120) return { label: "Elevada", nivel: "leve" };
  return { label: "Normal", nivel: "normal" };
}

// Glucosa en ayuno (ADA). Se asume ayuno por ser el criterio más común en checkups
// laborales; no está confirmado por el documento (sección 44).
export function clasificarGlucosa(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < 100) return { label: "Normal", nivel: "normal" };
  if (valor < 126) return { label: "Prediabetes", nivel: "leve" };
  return { label: "Diabetes", nivel: "alto" };
}

export function clasificarColesterol(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < 200) return { label: "Deseable", nivel: "normal" };
  if (valor < 240) return { label: "Limítrofe", nivel: "leve" };
  return { label: "Alto", nivel: "alto" };
}

export function clasificarTrigliceridos(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < 150) return { label: "Normal", nivel: "normal" };
  if (valor < 200) return { label: "Limítrofe", nivel: "leve" };
  if (valor < 500) return { label: "Alto", nivel: "alto" };
  return { label: "Muy alto", nivel: "critico" };
}

// Índice cintura-talla. Mismos cortes que ya usa Indicadores.tsx (ictInfo).
export function clasificarICT(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < 50) return { label: "Normal", nivel: "normal" };
  if (valor < 60) return { label: "Riesgo elevado", nivel: "leve" };
  return { label: "Riesgo muy elevado", nivel: "alto" };
}

// El campo Riesgo (int) sigue la misma convención ya usada en Indicadores.tsx
// (IdRiesgo: 1 = Sano, 2 = Moderado, 3 = Alto).
export function clasificarRiesgo(valor: number | null): Clasificacion {
  if (valor == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor === 1) return { label: "Sano", nivel: "normal" };
  if (valor === 2) return { label: "Riesgo moderado", nivel: "leve" };
  if (valor === 3) return { label: "Riesgo alto", nivel: "alto" };
  return { label: "Sin clasificar", nivel: "sin_dato" };
}

export const GRUPOS_ETARIOS: { min: number; max: number; label: string }[] = [
  { min: 18, max: 29, label: "18-29" },
  { min: 30, max: 39, label: "30-39" },
  { min: 40, max: 49, label: "40-49" },
  { min: 50, max: 59, label: "50-59" },
  { min: 60, max: Infinity, label: "60+" },
];

// Tipo de empleado a partir de Categoria_desc: "C" (Confianza) vs. cualquier otro
// valor (Sindicalizado). Regla dada por el usuario: Confianza => C, todo lo demás
// Sindicalizado.
export function clasificarTipoEmpleado(categoriaDesc: string | null): "Confianza" | "Sindicalizado" | null {
  if (!categoriaDesc) return null;
  return categoriaDesc.trim().toUpperCase().startsWith("C") ? "Confianza" : "Sindicalizado";
}

export function clasificarGrupoEtario(edad: number | null): string {
  if (edad == null) return "No clasificado";
  const grupo = GRUPOS_ETARIOS.find((g) => edad >= g.min && edad <= g.max);
  return grupo ? grupo.label : "No clasificado";
}

// Bandas OMS simplificadas (4 categorías), usadas específicamente en el gráfico
// de IMC agrupado por sexo, donde interesa la comparación gruesa Hombres/Mujeres
// más que el detalle de grados de obesidad (que sí se muestra en clasificarIMC).
export const CATEGORIAS_IMC_OMS = ["Bajo peso", "Normopeso", "Sobrepeso", "Obesidad"] as const;
export type CategoriaImcOms = typeof CATEGORIAS_IMC_OMS[number];

export function clasificarIMCSimplificado(valor: number | null): CategoriaImcOms | null {
  if (valor == null) return null;
  if (valor < 18.5) return "Bajo peso";
  if (valor < 25) return "Normopeso";
  if (valor < 30) return "Sobrepeso";
  return "Obesidad";
}

// Umbrales de laboratorio (dos cortes) usados en el explorador de dispersión
// metabólico: [alterado/límite, alto riesgo/diagnóstico].
export const UMBRALES_LABORATORIO: Record<string, [number, number]> = {
  Glucosa: [100, 126],
  Colesterol: [200, 240],
  Trigliceridos: [150, 200],
};
