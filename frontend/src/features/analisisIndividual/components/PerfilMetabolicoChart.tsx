import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PerfilMetabolico } from "../types";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";

interface PerfilMetabolicoChartProps {
  meses: string[];
  perfil: PerfilMetabolico;
}

// Los tres azules del sistema (index.css: --color-sea-blue/sky-blue/horz-blue).
const SERIES_METABOLICAS = [
  { key: "glucosa", label: "Glucosa", color: "#EE7523" },
  { key: "colesterol", label: "Colesterol", color: "#EF4444" },
  { key: "trigliceridos", label: "Triglicéridos", color: "#FFC627" },
] as const;

// Umbral de cada indicador: mismo color que su serie, más tenue.
const COLOR_UMBRAL: Record<string, string> = {
  glucosa: "#EF4444",
  colesterol: "#EE7523",
  trigliceridos: "#FFC627",
};

// Mismo estilo de tooltip que las gráficas de Expediente (Somatometría, Cardiovascular, etc.).
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipPerfil: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  // Los umbrales (dataKey "limXxx") se ven en la gráfica como línea punteada
  // de referencia; no necesitan fila propia en el tooltip.
  const filas = payload.filter((p: any) => p.value != null && !String(p.dataKey).startsWith("lim"));
  if (!filas.length) return null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {filas.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="size-2 rounded-full inline-block" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const PerfilMetabolicoChart: React.FC<PerfilMetabolicoChartProps> = ({ meses, perfil }) => {
  const serie = useMemo(
    () => meses.map((mes, i) => ({
      mes,
      glucosa: perfil.Glucosa[i] ?? null,
      colesterol: perfil.Colesterol[i] ?? null,
      trigliceridos: perfil.Trigliceridos[i] ?? null,
      limGlucosa: perfil.UmbralGlucosa,
      limColesterol: perfil.UmbralColesterol,
      limTrigliceridos: perfil.UmbralTrigliceridos,
    })),
    [meses, perfil]
  );

  const hayDatos = serie.some((p) => p.glucosa != null || p.colesterol != null || p.trigliceridos != null);

  // Series ocultas por clic en la leyenda (mismo toggle que Somatometría/Cardiovascular).
  // Los umbrales de referencia no son parte de la leyenda interactiva: se
  // muestran siempre que haya dato, igual que las bandas/líneas de referencia
  // del resto del dashboard.
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
        <i className="fa-solid fa-share-nodes mr-2"></i>Perfil Metabólico
      </h3>
      {hayDatos ? (
        <>
          <div className="relative overflow-hidden">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
              <Tooltip content={<TooltipPerfil />} />
              {SERIES_METABOLICAS.map((s) => !seriesOcultas.has(s.key) && (
                <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} connectNulls dot={{ r: 3 }} animationDuration={900} animationEasing="ease-out" />
              ))}
              {perfil.UmbralGlucosa != null && !seriesOcultas.has("glucosa") && <Line type="linear" dataKey="limGlucosa" name={`Lím. glucosa (${perfil.UmbralGlucosa})`} stroke={COLOR_UMBRAL.glucosa} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={900} animationEasing="ease-out" />}
              {perfil.UmbralColesterol != null && !seriesOcultas.has("colesterol") && <Line type="linear" dataKey="limColesterol" name={`Lím. colesterol (${perfil.UmbralColesterol})`} stroke={COLOR_UMBRAL.colesterol} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={900} animationEasing="ease-out" />}
              {perfil.UmbralTrigliceridos != null && !seriesOcultas.has("trigliceridos") && <Line type="linear" dataKey="limTrigliceridos" name={`Lím. triglicéridos (${perfil.UmbralTrigliceridos})`} stroke={COLOR_UMBRAL.trigliceridos} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={900} animationEasing="ease-out" />}
            </LineChart>
          </ResponsiveContainer>
          <ShimmerOverlay />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {SERIES_METABOLICAS.map((s) => {
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
        <div className="h-[210px] flex items-center justify-center text-xs text-gray-400">Sin datos de perfil metabólico disponibles.</div>
      )}
    </div>
  );
};

export default PerfilMetabolicoChart;
