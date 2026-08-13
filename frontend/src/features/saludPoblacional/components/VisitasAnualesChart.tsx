import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { VisitaAnioConTendencia } from "../analytics";
import ShimmerOverlay from "./shared/ShimmerOverlay";

interface VisitasAnualesChartProps {
  anios: VisitaAnioConTendencia[];
  onSeleccionarAnio: (anio: number) => void;
}

const COLOR_BARRA = "#009BDE";

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipVisitas: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const cambioPct: number | null = payload[0]?.payload?.cambioPct ?? null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p className="flex items-center gap-1.5 text-gray-500">
        <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: COLOR_BARRA }}></span>
        Visitas: <span className="font-bold text-gray-700">{payload[0].value}</span>
      </p>
      <p className="flex items-center gap-1.5 text-gray-500 mt-1 pt-1 border-t border-gray-100">
        Tendencia:{" "}
        {cambioPct == null ? (
          <span className="text-gray-400 font-bold">Sin dato previo</span>
        ) : (
          <span className={`font-bold ${cambioPct > 0 ? "text-green-600" : cambioPct < 0 ? "text-red-600" : "text-gray-500"}`}>
            <i className={`mdi ${cambioPct > 0 ? "mdi-trending-up" : cambioPct < 0 ? "mdi-trending-down" : "mdi-trending-neutral"} mr-0.5`}></i>
            {cambioPct > 0 ? "+" : ""}{cambioPct}%
          </span>
        )}
      </p>
    </div>
  );
};

// Una barra por año, siempre todos los años disponibles (sin selector de
// rango — decisión explícita del usuario, quitar el control de "últimos N
// años"). El clic sigue abriendo el detalle por departamento de ese año en
// VisitasPorDepartamentoChart.
const VisitasAnualesChart: React.FC<VisitasAnualesChartProps> = ({ anios, onSeleccionarAnio }) => {
  if (anios.length === 0) {
    return (
      <div className="rounded-lg p-4 flex-1 min-w-0">
        <h3 className="text-xs font-bold text-gray-600 mb-2">
          <i className="fa-solid fa-calendar-check mr-2"></i>Asistencia anual
        </h3>
        <div className="h-64 flex items-center justify-center text-xs text-gray-400 text-center px-6">
          Sin visitas registradas.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4 flex-1 min-w-0">
      <h3 className="text-xs font-bold text-gray-600 mb-2">
        <i className="fa-solid fa-calendar-check mr-2"></i>Asistencia anual a indicadores
      </h3>
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={anios} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<TooltipVisitas />} cursor={{ fill: "#f8fafc" }} />
            <Bar
              dataKey="total"
              name="Visitas"
              fill={COLOR_BARRA}
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
              onClick={(data: any) => onSeleccionarAnio(data.anio)}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
        <ShimmerOverlay subtle />
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">Clic en una barra para ver el detalle por departamento</p>
    </div>
  );
};

export default VisitasAnualesChart;
