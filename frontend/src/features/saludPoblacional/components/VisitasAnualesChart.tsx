import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ParAnual, VisitasDepto } from "../analytics";
import ShimmerOverlay from "./shared/ShimmerOverlay";

interface VisitasAnualesChartProps {
  pares: ParAnual[];
  cantidadPares: number;
  cantidadMaxima: number;
  onCambiarCantidad: (n: number) => void;
  detallePorDepto: VisitasDepto[];
  anioDetalle: number | null;
  onSeleccionarPar: (anioActual: number) => void;
}

const COLOR_ANTERIOR = "#009BDE";
const COLOR_ACTUAL = "#002E6D";

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";
const selectCls = "text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer";

const TooltipVisitas: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  // Todas las barras del grupo comparten el mismo objeto de fila (ParAnual),
  // así que cambioPct se lee de cualquiera de ellas — no depende de sobre
  // cuál barra esté el mouse.
  const cambioPct: number | null = payload[0]?.payload?.cambioPct ?? null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
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

// Barras agrupadas (año anterior / año actual) por cada par consecutivo,
// ej. "2024/2025", "2025/2026" — cada año aparece en dos grupos, es la
// comparación deslizante que se pidió, no un total anualizado. Clic en
// cualquier barra o en el badge de tendencia abre el detalle por
// Depto_Series del año ACTUAL de ese par (el segundo año del label).
const VisitasAnualesChart: React.FC<VisitasAnualesChartProps> = ({
  pares,
  cantidadPares,
  cantidadMaxima,
  onCambiarCantidad,
  detallePorDepto,
  anioDetalle,
  onSeleccionarPar,
}) => {
  const opcionesCantidad = useMemo(
    () => Array.from({ length: Math.max(cantidadMaxima - 1, 0) }, (_, i) => i + 2),
    [cantidadMaxima]
  );

  if (pares.length === 0) {
    return (
      <div className="rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">
          <i className="fa-solid fa-calendar-check mr-2"></i>Asistencia anual (año vs. año anterior)
        </h3>
        <div className="h-64 flex items-center justify-center text-xs text-gray-400 text-center px-6">
          Se necesitan al menos 2 años con visitas registradas.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-calendar-check mr-2"></i>Asistencia anual (año vs. año anterior)
        </h3>
        {opcionesCantidad.length > 1 && (
          <select className={selectCls} value={cantidadPares} onChange={(e) => onCambiarCantidad(Number(e.target.value))}>
            {opcionesCantidad.map((n) => <option key={n} value={n}>Últimos {n} periodos</option>)}
          </select>
        )}
      </div>
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={pares} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<TooltipVisitas />} cursor={{ fill: "#f8fafc" }} />
            <Bar
              dataKey="totalAnterior"
              name="Año anterior"
              fill={COLOR_ANTERIOR}
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
              onClick={(data: any) => onSeleccionarPar(data.anioActual)}
              cursor="pointer"
            />
            <Bar
              dataKey="totalActual"
              name="Año actual"
              fill={COLOR_ACTUAL}
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
              onClick={(data: any) => onSeleccionarPar(data.anioActual)}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
        <ShimmerOverlay subtle />
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">Pasa el mouse para ver la tendencia · clic en una barra para ver el detalle por departamento</p>

      {anioDetalle != null && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">Distribución por departamento — {anioDetalle}</p>
          {detallePorDepto.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(detallePorDepto.length * 28, 120)}>
              <BarChart data={detallePorDepto} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="depto" tick={{ fontSize: 10 }} width={140} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as VisitasDepto;
                    return (
                      <div className={tooltipCls}>
                        <p className="font-bold text-gray-700">{d.depto}</p>
                        <p className="text-gray-500">Visitas: <span className="font-bold text-gray-700">{d.total}</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" name="Visitas" fill="#009BDE" radius={[0, 4, 4, 0]} animationDuration={700} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Sin visitas registradas ese año.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitasAnualesChart;
