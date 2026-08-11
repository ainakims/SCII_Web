// Paleta de este feature (independiente de saludPoblacional: contrato de datos
// distinto). Semáforo verde/amarillo/naranja (bajo/medio/alto), con los
// mismos colores de marca que ya usa el resto del sitio: aqua-green,
// sunray-yellow (ámbar/leve en NIVEL_COLOR de AntropometriaSection.tsx) y
// sunset-orange (naranja/alto en el mismo NIVEL_COLOR).

import { NivelRiesgo, Prioridad } from "./types";

export const COLOR_RIESGO: Record<1 | 2 | 3, string> = {
  1: "#54BBAB",
  2: "#FFC627",
  3: "#EE7523",
};

export function colorNivelRiesgo(nivel: NivelRiesgo): string {
  if (nivel === 1) return COLOR_RIESGO[1];
  if (nivel === 2) return COLOR_RIESGO[2];
  if (nivel === 3) return COLOR_RIESGO[3];
  return "#9ca3af";
}

export const ESTILOS_PRIORIDAD: Record<Prioridad, string> = {
  Baja: "bg-linear-to-r from-aqua-green/30 to-aqua-green/10 text-green-900",
  Media: "bg-linear-to-r from-sunray-yellow/30 to-sunray-yellow/10 text-yellow-600",
  Alta: "bg-linear-to-r from-red-200 to-red-100/50 text-red-600",
  Critica: "bg-linear-to-r from-red-400/40 to-red-300/20 text-red-800",
};

export const PALETA_SERIE = ["#002E6D", "#009BDE", "#f59e0b", "#8b5cf6", "#0d9488", "#ef4444", "#6366f1", "#84cc16"];
