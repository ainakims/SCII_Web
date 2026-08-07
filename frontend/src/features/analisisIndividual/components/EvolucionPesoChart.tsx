import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EvolucionPesoAnual } from "../types";
import Card from "./Card";

interface EvolucionPesoChartProps {
  datos: EvolucionPesoAnual;
}

const EvolucionPesoChart: React.FC<EvolucionPesoChartProps> = ({ datos }) => {
  const serie = useMemo(
    () => datos.Fechas.map((fecha, i) => ({ fecha, real: datos.PesoReal[i] ?? null, ideal: datos.PesoIdeal[i] ?? null })),
    [datos]
  );

  const hayDatos = serie.some((p) => p.real != null || p.ideal != null);
  const meta = [...datos.PesoIdeal].reverse().find((v) => v != null) ?? null;

  return (
    <Card
      icon="mdi-scale-balance"
      iconColorClass="text-green-500"
      title="Peso real vs. peso ideal"
      badge={meta != null && (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Meta: {meta} kg</span>
      )}
    >
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="gradientePesoReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#002E6D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#002E6D" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} unit=" kg" width={38} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={9} />
            <Area type="monotone" dataKey="real" name="Peso real (kg)" stroke="#002E6D" strokeWidth={2.5} fill="url(#gradientePesoReal)" dot={{ r: 3 }} connectNulls />
            <Area type="monotone" dataKey="ideal" name="Peso ideal (kg)" stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" fill="none" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Sin datos de peso disponibles.</div>
      )}
    </Card>
  );
};

export default EvolucionPesoChart;
