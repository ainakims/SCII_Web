import React from "react";
import { HeatmapAsistenciaMes } from "../types";
import { colorNivelRiesgo } from "../colores";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";

interface HeatmapAsistenciaProps {
  meses: HeatmapAsistenciaMes[];
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

const HeatmapAsistencia: React.FC<HeatmapAsistenciaProps> = ({ meses }) => (
  <div className="rounded-lg shadow-xl p-4">
    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
      <h3 className="text-xs font-bold text-gray-600 flex items-center">
        <i className="fa-solid fa-calendar-week mr-2"></i>Riesgo por Indicador
      </h3>
      <span className="text-[10px] text-gray-400 font-medium">Ene - Dic</span>
    </div>
    <div className="relative overflow-hidden">
      <div className="grid grid-cols-12 gap-1.5">
        {meses.map((m, i) => {
          const c = estiloCelda(m);
          return (
            // Tooltip propio (burbuja + triángulo, revelada con group-hover) en vez
            // del title nativo del navegador — mismo patrón que DepartamentoTabla.tsx.
            <div key={i} className="relative group/tooltip">
              <div
                className={`aspect-square w-full rounded-md flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-default ${c.estilo}`}
                style={c.fondo ? { backgroundColor: c.fondo } : undefined}
              >
                <span className="text-[10px] font-bold">{m.Mes}</span>
              </div>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tooltip:block z-20 w-max">
                <div className="bg-white text-gray-700 text-[10px] rounded-md px-2 py-1.5 shadow-md leading-snug text-center whitespace-nowrap">
                  <span className="font-bold">{m.Mes}:</span> {textoCelda(m)}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white"></div>
              </div>
            </div>
          );
        })}
      </div>
      <ShimmerOverlay subtle />
    </div>
    <div className="flex flex-wrap justify-between gap-2 mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(1) }}></span>Riesgo Bajo</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(2) }}></span>Riesgo Medio</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(3) }}></span>Riesgo Alto</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block bg-gray-200"></span>Sin registro</span>
    </div>
  </div>
);

export default HeatmapAsistencia;
