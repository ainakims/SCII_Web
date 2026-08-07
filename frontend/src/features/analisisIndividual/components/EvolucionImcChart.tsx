import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EvolucionIMC } from "../types";
import { colorNivelRiesgo } from "../colores";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface EvolucionImcChartProps {
  meses: string[];
  evolucion: EvolucionIMC;
}

const EvolucionImcChart: React.FC<EvolucionImcChartProps> = ({ meses, evolucion }) => {
  const serie = useMemo(
    () => meses.map((mes, i) => ({ mes, imc: evolucion.ValoresIMC[i] ?? null, riesgo: evolucion.NivelRiesgo[i] ?? null })),
    [meses, evolucion]
  );

  const hayDatos = serie.some((p) => p.imc != null);
  const ultimoImc = [...serie].reverse().find((p) => p.imc != null)?.imc ?? null;

  return (
    <SectionCard
      icon="human"
      title="Evolución de IMC"
      subtitle="El color de cada punto indica el nivel de riesgo de esa medición"
      actions={ultimoImc != null && (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-blue/10 text-sky-blue border border-sky-blue/20">
          IMC actual: {ultimoImc}
        </span>
      )}
    >
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value: any) => [value, "IMC"]} />
            <Line
              type="monotone"
              dataKey="imc"
              name="IMC"
              stroke="#0070BD"
              strokeWidth={2}
              connectNulls
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (payload.imc == null) return <React.Fragment key={`dot-${index}`} />;
                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4.5} fill={colorNivelRiesgo(payload.riesgo)} stroke="#fff" strokeWidth={1.5} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos de IMC disponibles.</div>
      )}
    </SectionCard>
  );
};

export default EvolucionImcChart;
