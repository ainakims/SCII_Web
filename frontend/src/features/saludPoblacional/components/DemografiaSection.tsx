import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RegistroValidado } from "../types";
import { distribucionPorCampo, distribucionEdad } from "../analytics";
import SectionCard from "./shared/SectionCard";

interface DemografiaSectionProps {
  estadoActual: RegistroValidado[];
}

const BAR_COLOR = "#009BDE";

const MiniBarChart: React.FC<{ data: { label: string; count: number }[]; height?: number }> = ({ data, height = 220 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="count" name="Personas" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

// Sección 23 del documento. Todas las distribuciones se calculan sobre el estado
// actual de la población filtrada (una persona = un punto).
const DemografiaSection: React.FC<DemografiaSectionProps> = ({ estadoActual }) => {
  const edad = useMemo(() => distribucionEdad(estadoActual), [estadoActual]);
  const depto = useMemo(() => distribucionPorCampo(estadoActual, "Depto_nombre").slice(0, 10), [estadoActual]);

  return (
    <SectionCard icon="account-multiple-outline" title="Demografía" subtitle="Distribución de la población seleccionada (estado actual)">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Grupo etario</h3>
          <MiniBarChart data={edad} />
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Departamento (top 10)</h3>
          <MiniBarChart data={depto} />
        </div>
      </div>
    </SectionCard>
  );
};

export default DemografiaSection;
