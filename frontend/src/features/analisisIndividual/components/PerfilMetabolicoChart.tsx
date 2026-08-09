import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PerfilMetabolico } from "../types";
import Card from "./Card";

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
      limGlucosa: perfil.UmbralGlucosa,
      limColesterol: perfil.UmbralColesterol,
      limTrigliceridos: perfil.UmbralTrigliceridos,
    })),
    [meses, perfil]
  );

  const hayDatos = serie.some((p) => p.glucosa != null || p.colesterol != null || p.trigliceridos != null);

  return (
    <Card icon="mdi-test-tube" iconColorClass="text-purple-500" title="Perfil metabólico vs. umbrales" badge={<span className="text-[10px] text-gray-400 font-medium">Líneas de referencia</span>}>
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} />
            <Line type="monotone" dataKey="glucosa" name="Glucosa" stroke="#0070BD" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="colesterol" name="Colesterol" stroke="#ef4444" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            <Line type="monotone" dataKey="trigliceridos" name="Triglicéridos" stroke="#f59e0b" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            {perfil.UmbralGlucosa != null && <Line type="monotone" dataKey="limGlucosa" name={`Lím. glucosa (${perfil.UmbralGlucosa})`} stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
            {perfil.UmbralColesterol != null && <Line type="monotone" dataKey="limColesterol" name={`Lím. colesterol (${perfil.UmbralColesterol})`} stroke="#fca5a5" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
            {perfil.UmbralTrigliceridos != null && <Line type="monotone" dataKey="limTrigliceridos" name={`Lím. triglicéridos (${perfil.UmbralTrigliceridos})`} stroke="#fde047" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[210px] flex items-center justify-center text-xs text-gray-400">Sin datos de perfil metabólico disponibles.</div>
      )}
    </Card>
  );
};

export default PerfilMetabolicoChart;
