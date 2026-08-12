// Utilidades compartidas por las gráficas de "Seguimiento Histórico"
// (UltimaTomaSection.tsx) para extraer el año de sus fechas/etiquetas,
// filtrar por el rango seleccionado en SelectorRangoAnios, y armar la
// leyenda de "rango mostrado" debajo de cada gráfica.

const MESES_ABREV: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

// "01/Mar/2025" -> Date completa (formato de EvolucionPesoAnual.Fechas /
// PresionArterial.Fechas, ver EvolucionPesoChart.tsx).
export function fechaDeDDMonYYYY(fecha: string): Date | null {
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;
  const dia = Number(partes[0]);
  const mes = MESES_ABREV[partes[1].toLowerCase()];
  const anio = Number(partes[2]);
  if (!Number.isFinite(dia) || mes == null || !Number.isFinite(anio)) return null;
  const fechaObj = new Date(anio, mes, dia);
  return isNaN(fechaObj.getTime()) ? null : fechaObj;
}

export function anioDeDDMonYYYY(fecha: string): number | null {
  return fechaDeDDMonYYYY(fecha)?.getFullYear() ?? null;
}

// "Mar 2025" -> Date (día 1) — formato de HistoricosYGraficas.Meses, el mismo
// "Mon yyyy" que produce formatearMesAnio() en EvolucionPesoChart.tsx.
export function fechaDeEtiquetaMesAnio(etiqueta: string): Date | null {
  const m = etiqueta.match(/^([A-Za-zÁÉÍÓÚáéíóú]{3})\.?\s+(\d{4})$/);
  if (!m) return null;
  const mes = MESES_ABREV[m[1].toLowerCase()];
  const anio = Number(m[2]);
  if (mes == null || !Number.isFinite(anio)) return null;
  return new Date(anio, mes, 1);
}

export function anioDeEtiquetaMesAnio(etiqueta: string): number | null {
  return fechaDeEtiquetaMesAnio(etiqueta)?.getFullYear() ?? null;
}

// Años únicos presentes en una lista (ignora nulos), ordenados ascendente.
export function aniosUnicos(anios: (number | null)[]): number[] {
  return Array.from(new Set(anios.filter((a): a is number => a != null))).sort((a, b) => a - b);
}

export interface RangoAnios { desde: number; hasta: number; }

// Rango por default: los últimos dos años disponibles (para poder comparar
// de entrada, sin que el usuario tenga que tocar el selector), o el único
// año disponible si solo hay uno.
export function rangoPorDefecto(aniosDisponibles: number[]): RangoAnios | null {
  if (aniosDisponibles.length === 0) return null;
  const hasta = aniosDisponibles[aniosDisponibles.length - 1];
  const desde = aniosDisponibles.length >= 2 ? aniosDisponibles[aniosDisponibles.length - 2] : hasta;
  return { desde, hasta };
}

export function formatoMesAnioLargo(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
