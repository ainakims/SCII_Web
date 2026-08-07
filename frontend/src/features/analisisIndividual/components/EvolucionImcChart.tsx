import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EvolucionIMC } from "../types";
import { colorNivelRiesgo } from "../colores";
import Card from "./Card";

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
    <Card
      icon="mdi-human"
      title="Evolución de IMC"
      badge={ultimoImc != null && (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">IMC actual: {ultimoImc}</span>
      )}
    >
      {hayDatos ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="gradienteImc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0070BD" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0070BD" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip formatter={(value: any) => [value, "IMC"]} />
            <Area
              type="monotone"
              dataKey="imc"
              name="IMC"
              stroke="#0070BD"
              strokeWidth={2.5}
              fill="url(#gradienteImc)"
              connectNulls
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (payload.imc == null) return <React.Fragment key={`dot-${index}`} />;
                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={colorNivelRiesgo(payload.riesgo)} stroke="#fff" strokeWidth={1.5} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">Sin datos de IMC disponibles.</div>
      )}
    </Card>
  );
};

export default EvolucionImcChart;
