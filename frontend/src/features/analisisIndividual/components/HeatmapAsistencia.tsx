import React from "react";
import { HeatmapAsistenciaMes } from "../types";
import { colorNivelRiesgo } from "../colores";
import Card from "./Card";

interface HeatmapAsistenciaProps {
  meses: HeatmapAsistenciaMes[];
}

function estiloCelda(m: HeatmapAsistenciaMes) {
  if (m.Estatus === "future") return { estilo: "bg-gray-50 text-gray-300 border border-dashed border-gray-200" };
  if (m.Estatus === "miss") return { estilo: "bg-gray-200 text-gray-500" };
  return { estilo: "text-white", fondo: colorNivelRiesgo(m.Riesgo) };
}

const HeatmapAsistencia: React.FC<HeatmapAsistenciaProps> = ({ meses }) => (
  <Card icon="mdi-calendar-month-outline" title="Matriz de riesgo mensual por indicadores" badge={<span className="text-[10px] text-gray-400 font-medium">Ene - Dic</span>}>
    <div className="grid grid-cols-12 gap-1.5">
      {meses.map((m, i) => {
        const c = estiloCelda(m);
        return (
          <div
            key={i}
            className={`aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-default ${c.estilo}`}
            style={c.fondo ? { backgroundColor: c.fondo } : undefined}
            title={`${m.Mes}: ${m.Estatus}${m.Riesgo ? ` · riesgo ${m.Riesgo}` : ""}`}
          >
            <span className="text-[10px] font-bold">{m.Mes}</span>
            <span className="text-[8px] opacity-80">{m.Riesgo ? `R${m.Riesgo}` : "-"}</span>
          </div>
        );
      })}
    </div>
    <div className="flex flex-wrap justify-between gap-2 mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(1) }}></span>Riesgo 1 (Bajo)</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(2) }}></span>Riesgo 2 (Medio)</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block" style={{ backgroundColor: colorNivelRiesgo(3) }}></span>Riesgo 3 (Alto)</span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="size-2.5 rounded-sm inline-block bg-gray-200"></span>Sin registro</span>
    </div>
  </Card>
);

export default HeatmapAsistencia;
