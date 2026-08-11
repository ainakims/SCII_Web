import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PresionArterial } from "../types";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";

interface PresionArterialChartProps {
  datos: PresionArterial;
}

// Mismos colores que Sistólica/Diastólica en CardiovascularSection.tsx (COLOR_PRESION).
const SERIES_PRESION = [
  { key: "sistolica", label: "Sistólica", color: "#EF4444" },
  { key: "diastolica", label: "Diastólica", color: "#EE7523" },
] as const;

// Mismo estilo de tooltip que las gráficas de Expediente (Somatometría, Cardiovascular, etc.).
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipPresion: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const origen = payload[0]?.payload?.origen;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label} {origen ? `· ${origen}` : ""}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="size-2 rounded-full inline-block" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const PresionArterialChart: React.FC<PresionArterialChartProps> = ({ datos }) => {
  const serie = useMemo(
    () => datos.Fechas.map((fecha, i) => ({
      fecha,
      sistolica: datos.Sistolica[i] ?? null,
      diastolica: datos.Diastolica[i] ?? null,
      origen: datos.Origen[i] ?? null,
    })),
    [datos]
  );

  const hayDatos = serie.some((p) => p.sistolica != null || p.diastolica != null);

  // Series ocultas por clic en la leyenda (mismo toggle que Somatometría/Cardiovascular).
  const [seriesOcultas, setSeriesOcultas] = useState<Set<string>>(new Set());
  const toggleSerie = (key: string) => {
    setSeriesOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="rounded-lg shadow-xl p-4">
      <h3 className="text-xs font-bold text-gray-600 flex items-center mb-2">
        <i className="fa-solid fa-heart-pulse mr-2"></i>Presión Arterial
      </h3>
      {hayDatos ? (
        <>
          <div className="relative overflow-hidden">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={30} />
                <Tooltip content={<TooltipPresion />} />
                <ReferenceLine y={160} stroke="#ef4444" strokeDasharray="4 4" />
                {SERIES_PRESION.map((s) => !seriesOcultas.has(s.key) && (
                  <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} connectNulls dot={{ r: 3 }} animationDuration={900} animationEasing="ease-out" />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <ShimmerOverlay />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {SERIES_PRESION.map((s) => {
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
        </>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Sin datos de presión arterial disponibles.</div>
      )}
    </div>
  );
};

export default PresionArterialChart;
