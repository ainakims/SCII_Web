import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DistribucionRiesgoDepto } from "../analytics";
import ShimmerOverlay from "./shared/ShimmerOverlay";

interface RiesgoPorDepartamentoChartProps {
  datos: DistribucionRiesgoDepto[];
}

// Barras agrupadas (sin stackId), no apiladas: a diferencia de un stacked bar,
// un departamento con 1 caso de riesgo alto sigue siendo visible como su
// propia barra en vez de perderse dentro de una pila junto a valores mucho
// más grandes.
const SERIES_RIESGO: { key: "sano" | "moderado" | "alto"; label: string; color: string }[] = [
  { key: "sano", label: "Sano", color: "#54BBAB"},
  { key: "moderado", label: "Riesgo moderado", color: "#FFC627" },
  { key: "alto", label: "Riesgo alto", color: "#EE7523" }
];

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipRiesgoDepto: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const RiesgoPorDepartamentoChart: React.FC<RiesgoPorDepartamentoChartProps> = ({ datos }) => {
  // Mismo toggle de leyenda que el resto del dashboard (Somatometría/Cardiovascular):
  // la serie oculta se fuerza a 0 sin perder el conteo real en `datos`.
  const [seriesOcultas, setSeriesOcultas] = useState<Set<string>>(new Set());
  const toggleSerie = (key: string) => {
    setSeriesOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const datosVisibles = useMemo(
    () =>
      datos.map((d) => {
        const fila: Record<string, string | number> = { depto: d.depto };
        SERIES_RIESGO.forEach((s) => { fila[s.key] = seriesOcultas.has(s.key) ? 0 : d[s.key]; });
        return fila;
      }),
    [datos, seriesOcultas]
  );

  if (datos.length === 0) {
    return (
      <div className="rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>Riesgo por departamento
        </h3>
        <div className="h-64 flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4">
      <h3 className="text-xs font-bold text-gray-600 mb-2">
        <i className="fa-solid fa-triangle-exclamation mr-2"></i>Riesgo por departamento
      </h3>
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datosVisibles} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
            dataKey="depto"    
            tick={{ fontSize: 9, fontWeight: 400 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={10} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<TooltipRiesgoDepto />} cursor={{ fill: "#f8fafc" }} />
            {SERIES_RIESGO.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out" />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <ShimmerOverlay subtle />
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        {SERIES_RIESGO.map((s) => {
          const oculto = seriesOcultas.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSerie(s.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
            >
              <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : s.color }}></span>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RiesgoPorDepartamentoChart;
