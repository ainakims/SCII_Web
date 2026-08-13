import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";
import { ConsultasDepto } from "../analytics";
import ShimmerOverlay from "./shared/ShimmerOverlay";

interface ConsultasPorDepartamentoChartProps {
  datos: ConsultasDepto[];
  anios: number[];
  anio: number | null;
  onCambiarAnio: (anio: number) => void;
}

const RADIAN = Math.PI / 180;
// Mismo mecanismo de "active shape" que ya usa la dona de ICT en
// AntropometriaSection.tsx (renderSectorIct): la rebanada seleccionada se
// desplaza hacia afuera del centro en vez de abrir un segundo anillo — un
// segundo nivel reintroduciría el mismo problema de proporción que ya se
// descartó para las barras apiladas (un protocolo con 1 consulta se vería
// igual de invisible que una rebanada diminuta).
const EXPLODE_OFFSET = 10;

// Paleta categórica por departamento (identidad, no severidad clínica) — se
// repite si hay más departamentos que colores, mismo criterio que
// PALETA_DEPTO en AntropometriaSection.tsx.
const PALETA_DEPTO = ["#009BDE", "#54BBAB", "#FFC627", "#EE7523", "#8B5CF6", "#EC4899", "#22C55E", "#F97316", "#0EA5E9", "#A855F7"];

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";
const selectCls = "text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer";

const ConsultasPorDepartamentoChart: React.FC<ConsultasPorDepartamentoChartProps> = ({ datos, anios, anio, onCambiarAnio }) => {
  const [deptoSeleccionado, setDeptoSeleccionado] = useState<string | null>(null);

  const total = datos.reduce((acc, d) => acc + d.total, 0);
  const deptoActivo = datos.find((d) => d.depto === deptoSeleccionado) ?? null;

  const renderSector = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    const seleccionado = deptoSeleccionado === payload.depto;
    const offset = seleccionado ? EXPLODE_OFFSET : 0;
    const dx = offset * Math.cos(-midAngle * RADIAN);
    const dy = offset * Math.sin(-midAngle * RADIAN);
    return (
      <g
        style={{ transform: `translate(${dx}px, ${dy}px)`, transition: "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        onClick={() => setDeptoSeleccionado(seleccionado ? null : payload.depto)}
        className="cursor-pointer"
      >
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  if (datos.length === 0) {
    return (
      <div className="rounded-lg p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-gray-600">
            <i className="fa-solid fa-stethoscope mr-2"></i>Consultas por departamento
          </h3>
          {anios.length > 0 && (
            <select className={selectCls} value={anio ?? ""} onChange={(e) => onCambiarAnio(Number(e.target.value))}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
        <div className="h-64 flex items-center justify-center text-xs text-gray-400 text-center px-6">
          Sin consultas registradas {anio ? `en ${anio}` : ""}.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-stethoscope mr-2"></i>Consultas por departamento
        </h3>
        <select className={selectCls} value={anio ?? ""} onChange={(e) => onCambiarAnio(Number(e.target.value))}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={datos}
              dataKey="total"
              nameKey="depto"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
              shape={renderSector}
            >
              {datos.map((d, i) => <Cell key={d.depto} fill={PALETA_DEPTO[i % PALETA_DEPTO.length]} />)}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as ConsultasDepto;
                const pct = total ? ((d.total / total) * 100).toFixed(1) : "0";
                return (
                  <div className={tooltipCls}>
                    <p className="font-bold text-gray-700 mb-1">{d.depto}</p>
                    <p className="text-gray-500">Consultas: <span className="font-bold text-gray-700">{d.total} ({pct}%)</span></p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <ShimmerOverlay subtle />
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">Clic en una rebanada para ver el detalle por protocolo</p>

      {deptoActivo && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">{deptoActivo.depto} — {deptoActivo.total} consultas</p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {deptoActivo.protocolos.map((p) => (
              <li key={p.nombre} className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="flex items-center gap-1.5">
                  <i className="mdi mdi-stethoscope text-sea-blue"></i>
                  {p.nombre}
                </span>
                <span className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded bg-sky-blue/10 text-sky-blue font-bold text-[10px]">{p.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConsultasPorDepartamentoChart;
