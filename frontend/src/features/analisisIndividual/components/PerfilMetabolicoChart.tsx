import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { PerfilMetabolico } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface PerfilMetabolicoChartProps {
  meses: string[];
  perfil: PerfilMetabolico;
}

const PerfilMetabolicoChart: React.FC<PerfilMetabolicoChartProps> = ({ meses, perfil }) => {
  const serie = useMemo(
    () => meses.map((mes, i) => ({
      mes,
      glucosa: perfil.Glucosa[i] ?? null,
      colesterol: perfil.Colesterol[i] ?? null,
      trigliceridos: perfil.Trigliceridos[i] ?? null,
    })),
    [meses, perfil]
  );

  const hayDatos = serie.some((p) => p.glucosa != null || p.colesterol != null || p.trigliceridos != null);

  return (
    <SectionCard icon="water-outline" title="Perfil metabólico" subtitle="Líneas punteadas: umbral de referencia por indicador">
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" mg/dL" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {perfil.UmbralGlucosa != null && <ReferenceLine y={perfil.UmbralGlucosa} stroke="#0070BD" strokeDasharray="4 4" />}
            {perfil.UmbralColesterol != null && <ReferenceLine y={perfil.UmbralColesterol} stroke="#f59e0b" strokeDasharray="4 4" />}
            {perfil.UmbralTrigliceridos != null && <ReferenceLine y={perfil.UmbralTrigliceridos} stroke="#ef4444" strokeDasharray="4 4" />}
            <Line type="monotone" dataKey="glucosa" name="Glucosa" stroke="#0070BD" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="colesterol" name="Colesterol" stroke="#f59e0b" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="trigliceridos" name="Triglicéridos" stroke="#ef4444" strokeWidth={2} connectNulls dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-xs text-gray-400">Sin datos de perfil metabólico disponibles.</div>
      )}
    </SectionCard>
  );
};

export default PerfilMetabolicoChart;
