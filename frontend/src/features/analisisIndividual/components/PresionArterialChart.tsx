import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { PresionArterial } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface PresionArterialChartProps {
  datos: PresionArterial;
}

const TooltipPresion: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const origen = payload[0]?.payload?.origen;
  return (
    <div className="bg-white shadow-lg rounded-lg p-2.5 text-xs border border-gray-100">
      <p className="font-bold text-gray-700 mb-1">{label} {origen ? `· ${origen}` : ""}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
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
      fc: datos.FrecuenciaCardiaca[i] ?? null,
      origen: datos.Origen[i] ?? null,
    })),
    [datos]
  );

  const hayDatos = serie.some((p) => p.sistolica != null || p.diastolica != null);

  return (
    <SectionCard icon="heart-pulse" title="Presión arterial y frecuencia cardiaca">
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<TooltipPresion />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine y={160} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="sistolica" name="Sistólica" stroke="#002E6D" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="diastolica" name="Diastólica" stroke="#009BDE" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="fc" name="Frec. cardiaca" stroke="#8b5cf6" strokeWidth={2} connectNulls dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-xs text-gray-400">Sin datos de presión arterial disponibles.</div>
      )}
      <p className="text-[10px] text-gray-400 mt-1">Líneas de referencia: 130 (elevada) y 160 (alta), NOM-030-SSA2-2009. El tooltip indica si la lectura vino del programa o de una consulta.</p>
    </SectionCard>
  );
};

export default PresionArterialChart;
