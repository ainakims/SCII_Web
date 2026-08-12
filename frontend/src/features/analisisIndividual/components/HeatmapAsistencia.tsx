import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeatmapAsistenciaAnio, HeatmapAsistenciaMes } from "../types";
import { colorNivelRiesgo } from "../colores";

interface HeatmapAsistenciaProps {
  anios: HeatmapAsistenciaAnio[];
}

const RIESGO_LABEL: Record<1 | 2 | 3, string> = { 1: "Bajo", 2: "Medio", 3: "Alto" };

function estiloCelda(m: HeatmapAsistenciaMes) {
  if (m.Estatus === "future") return { estilo: "bg-gray-50 text-gray-300 border border-dashed border-gray-200" };
  if (m.Estatus === "miss") return { estilo: "bg-gray-200 text-gray-500" };
  return { estilo: "text-white", fondo: colorNivelRiesgo(m.Riesgo) };
}

function textoCelda(m: HeatmapAsistenciaMes): string {
  if (m.Estatus === "future") return "Pendiente";
  if (m.Estatus === "miss") return "Sin registro";
  return `Riesgo ${m.Riesgo ? RIESGO_LABEL[m.Riesgo] : ""}`;
}

const HeatmapAsistencia: React.FC<HeatmapAsistenciaProps> = ({ anios }) => {
  const sortedAnios = useMemo(() => [...anios].sort((a, b) => a.Anio - b.Anio), [anios]);

  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);

  // Por defecto: el año en curso si viene en los datos, si no el más reciente
  // registrado. Se recalcula cada vez que llega un nuevo arreglo de años (p.ej.
  // al regenerar el análisis).
  useEffect(() => {
    if (sortedAnios.length === 0) {
      setAnioSeleccionado(null);
      return;
    }
    const anioActual = new Date().getFullYear();
    const existeAnioActual = sortedAnios.some((a) => a.Anio === anioActual);
    setAnioSeleccionado(existeAnioActual ? anioActual : sortedAnios[sortedAnios.length - 1].Anio);
  }, [sortedAnios]);

  const indice = sortedAnios.findIndex((a) => a.Anio === anioSeleccionado);
  const anioData = indice >= 0 ? sortedAnios[indice] : null;

  if (!anioData) {
    return (
      <div className="rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">
          <i className="fa-solid fa-grip mr-2"></i>Riesgo por Indicadores
        </h3>
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">Sin registros de asistencia disponibles.</div>
      </div>
    );
  }

  const irAnioAnterior = () => indice > 0 && setAnioSeleccionado(sortedAnios[indice - 1].Anio);
  const irAnioSiguiente = () => indice < sortedAnios.length - 1 && setAnioSeleccionado(sortedAnios[indice + 1].Anio);

  return (
    <div className="rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-grip mr-2"></i>Riesgo por Indicadores
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={irAnioAnterior}
            disabled={indice <= 0}
            title="Año anterior"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 tabular-nums px-1">{anioData.Anio}</span>
          <button
            onClick={irAnioSiguiente}
            disabled={indice >= sortedAnios.length - 1}
            title="Año siguiente"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        {anioData.Meses.map((m, i) => {
          const c = estiloCelda(m);
          return (
            <div
              key={i}
              className={`aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-default ${c.estilo}`}
              style={c.fondo ? { backgroundColor: c.fondo } : undefined}
              title={`${m.Mes} ${anioData.Anio}: ${m.Estatus}${m.Riesgo ? ` · riesgo ${m.Riesgo}` : ""}`}
            >
              <span className="text-[10px] font-bold">{m.Mes}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-between gap-2 mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(1) }}></span>Riesgo Bajo</span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(2) }}></span>Riesgo Medio</span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(3) }}></span>Riesgo Alto</span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block bg-gray-200"></span>Sin registro</span>
      </div>
    </div>
  );
};

export default HeatmapAsistencia;
