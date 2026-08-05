import React, { useMemo, useState } from "react";
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { RegistroValidado } from "../types";
import { obtenerValor, calcularEdad, regresionLineal, IndicadorClave } from "../analytics";
import { UMBRAL_SALUDABLE } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

interface RelacionesSectionProps {
  estadoActual: RegistroValidado[];
}

type VarX = "IMC" | "Edad" | "Sistolica" | "Glucosa";
type VarY = "Sistolica" | "Glucosa" | "Colesterol" | "Trigliceridos" | "IMC";

const VARIABLES_X: { campo: VarX; label: string }[] = [
  { campo: "IMC", label: "IMC" },
  { campo: "Edad", label: "Edad" },
  { campo: "Sistolica", label: "Presión sistólica" },
  { campo: "Glucosa", label: "Glucosa" },
];

const VARIABLES_Y: { campo: VarY; label: string }[] = [
  { campo: "Sistolica", label: "Presión sistólica" },
  { campo: "Glucosa", label: "Glucosa" },
  { campo: "Colesterol", label: "Colesterol" },
  { campo: "Trigliceridos", label: "Triglicéridos" },
  { campo: "IMC", label: "IMC" },
];

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

function extraerValor(registro: RegistroValidado, campo: VarX | VarY): number | null {
  if (campo === "Edad") return calcularEdad(registro.FechaNacimiento.original, registro.Fecha.original);
  return obtenerValor(registro, campo as IndicadorClave);
}

// Sección 27 del documento + motor de regresión lineal (mínimos cuadrados).
// Las relaciones visualizadas NO implican causalidad (sección 36).
const RelacionesSection: React.FC<RelacionesSectionProps> = ({ estadoActual }) => {
  const [varX, setVarX] = useState<VarX>("IMC");
  const [varY, setVarY] = useState<VarY>("Sistolica");

  const puntos = useMemo(() => {
    return estadoActual
      .map((r) => ({ x: extraerValor(r, varX), y: extraerValor(r, varY) }))
      .filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
  }, [estadoActual, varX, varY]);

  const regresion = useMemo(() => regresionLineal(puntos), [puntos]);

  const lineaAjuste = useMemo(() => {
    if (regresion.m == null || regresion.b == null || puntos.length === 0) return [];
    const xs = puntos.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return [
      { x: xMin, yAjuste: regresion.m * xMin + regresion.b },
      { x: xMax, yAjuste: regresion.m * xMax + regresion.b },
    ];
  }, [regresion, puntos]);

  const umbralY = UMBRAL_SALUDABLE[varY];
  const pctZonaSaludable = useMemo(() => {
    if (umbralY == null || puntos.length === 0) return null;
    const saludables = puntos.filter((p) => p.y <= umbralY).length;
    return Number(((saludables / puntos.length) * 100).toFixed(1));
  }, [puntos, umbralY]);

  const labelX = VARIABLES_X.find((v) => v.campo === varX)?.label ?? varX;
  const labelY = VARIABLES_Y.find((v) => v.campo === varY)?.label ?? varY;

  return (
    <SectionCard
      icon="chart-scatter-plot"
      title="Relaciones y tendencias lineales"
      subtitle="Explora asociaciones entre dos variables clínicas mediante regresión (no implica causalidad)"
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Variable X</label>
          <div className="relative mt-1">
            <select className={selectCls} value={varX} onChange={(e) => setVarX(e.target.value as VarX)}>
              {VARIABLES_X.map((v) => <option key={v.campo} value={v.campo}>{v.label}</option>)}
            </select>
            <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Variable Y</label>
          <div className="relative mt-1">
            <select className={selectCls} value={varY} onChange={(e) => setVarY(e.target.value as VarY)}>
              {VARIABLES_Y.map((v) => <option key={v.campo} value={v.campo}>{v.label}</option>)}
            </select>
            <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <KpiCard icon="shield-check-outline" label="% en zona saludable" value={pctZonaSaludable != null ? `${pctZonaSaludable}%` : "No aplica"} sub={umbralY != null ? `${labelY} ≤ ${umbralY}` : undefined} />
      </div>

      <p className="text-[10px] text-gray-400 mb-2">
        {puntos.length.toLocaleString("es-MX")} personas con ambos valores disponibles (de {estadoActual.length.toLocaleString("es-MX")} en la población seleccionada).
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="x" name={labelX} tick={{ fontSize: 10 }} label={{ value: labelX, position: "insideBottom", offset: -4, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={labelY} tick={{ fontSize: 10 }} label={{ value: labelY, angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {umbralY != null && (
            <ReferenceLine y={umbralY} stroke="#10b981" strokeDasharray="6 4" label={{ value: "Umbral saludable", fontSize: 10, fill: "#10b981", position: "insideTopRight" }} />
          )}
          <Scatter data={puntos} dataKey="y" fill="#005FAA" fillOpacity={0.5} />
          {lineaAjuste.length === 2 && (
            <Line data={lineaAjuste} dataKey="yAjuste" stroke="#002E6D" strokeWidth={2} dot={false} activeDot={false} legendType="none" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </SectionCard>
  );
};

export default RelacionesSection;
