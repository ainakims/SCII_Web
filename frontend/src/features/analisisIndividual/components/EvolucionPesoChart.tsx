import React, { useMemo } from "react";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EvolucionPesoAnual } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface EvolucionPesoChartProps {
  datos: EvolucionPesoAnual;
}

const EvolucionPesoChart: React.FC<EvolucionPesoChartProps> = ({ datos }) => {
  const serie = useMemo(
    () => datos.Fechas.map((fecha, i) => ({ fecha, real: datos.PesoReal[i] ?? null, ideal: datos.PesoIdeal[i] ?? null })),
    [datos]
  );

  const hayDatos = serie.some((p) => p.real != null || p.ideal != null);

  return (
    <SectionCard icon="scale-bathroom" title="Evolución de peso">
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="gradientePesoReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#002E6D" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#002E6D" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" kg" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="real" name="Peso real" stroke="#002E6D" strokeWidth={2.5} fill="url(#gradientePesoReal)" dot={{ r: 3 }} connectNulls />
            <Area type="monotone" dataKey="ideal" name="Peso ideal" stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" fill="none" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Sin datos de peso disponibles.</div>
      )}
    </SectionCard>
  );
};

export default EvolucionPesoChart;
