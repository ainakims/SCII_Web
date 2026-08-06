import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador, histogramaConjunto, obtenerValor, promedioPorGrupo } from "../analytics";
import { clasificarPresion } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

interface CardiovascularSectionProps {
  estadoActual: RegistroValidado[];
}

const COLOR_PRESION: Record<"Sistólica" | "Diastólica", string> = {
  "Sistólica": "#002E6D",
  "Diastólica": "#009BDE",
};

// Un color propio por estadio (no por `nivel`): "Etapa 1", "Etapa 2" y "Elevada"
// comparten nivel "alto", pero deben distinguirse visualmente — degradado de
// severidad creciente, verde a rojo oscuro.
const COLOR_ESTADIO_PRESION: Record<string, string> = {
  "Normal": "#54BBAB",
  "Elevada": "#FFC627",
  "Etapa 1": "#EE7523",
  "Etapa 2": "#ef4444",
  "Crisis": "#991b1b",
  "Sin dato": "#9ca3af",
};

// Orden clínico fijo (no el orden de aparición en los datos): Normal, Elevada,
// Etapa 1, Etapa 2, Crisis — mismas etiquetas que clasificarPresion.
const ORDEN_PRESION = ["Normal", "Elevada", "Etapa 1", "Etapa 2", "Crisis"] as const;

// Mismo estilo de tooltip que Antropometría: sin borde, con sombra y esquinas
// redondeadas, título de la gráfica, color propio de cada serie y el valor en
// negritas — letra pequeña para no saturar.
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipDistPresion: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">Distribución presión arterial</p>
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: p.color }}></span>
          {p.dataKey}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// Sección 25 del documento.
export const CardiovascularContenido: React.FC<CardiovascularSectionProps> = ({ estadoActual }) => {
  // Series ocultas por clic en la leyenda de "Distribución presión arterial"
  // (mismo toggle mostrar/ocultar que las leyendas de Antropometría).
  const [seriesPresionOcultas, setSeriesPresionOcultas] = useState<Set<string>>(new Set());
  const toggleSeriePresion = (serie: string) => {
    setSeriesPresionOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(serie)) next.delete(serie); else next.add(serie);
      return next;
    });
  };

  // Estadios ocultos por clic en la leyenda de "Presión arterial (ACC/AHA)"
  // (mismo toggle que la leyenda de Distribución de ICT en Antropometría).
  const [estadiosPresionOcultos, setEstadiosPresionOcultos] = useState<Set<string>>(new Set());
  const toggleEstadioPresion = (label: string) => {
    setEstadiosPresionOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const sistolica = useMemo(() => estadisticasIndicador(estadoActual, "Sistolica"), [estadoActual]);
  const diastolica = useMemo(() => estadisticasIndicador(estadoActual, "Diastolica"), [estadoActual]);

  // Sistólica y diastólica son un mismo conjunto de mediciones (una presión
  // arterial), no dos valores independientes — se muestran en una sola gráfica.
  const distPresion = useMemo(() => {
    const sist = estadoActual.map((r) => obtenerValor(r, "Sistolica")).filter((v): v is number => v != null);
    const diast = estadoActual.map((r) => obtenerValor(r, "Diastolica")).filter((v): v is number => v != null);
    console.log("Datos sistolicos:", JSON.stringify(estadoActual.map((r) => obtenerValor(r, "Sistolica"))));
    console.log("Datos diastolicos:", JSON.stringify(estadoActual.map((r) => obtenerValor(r, "Diastolica"))));
    console.log("Todos los datos de estado actual:", JSON.stringify(estadoActual))
    return histogramaConjunto({ "Sistólica": sist, "Diastólica": diast }, 10);
  }, [estadoActual]);

  // Datos que realmente se dibujan: la serie oculta por la leyenda se fuerza a
  // 0 (la barra desaparece) sin perder el conteo real en `distPresion`.
  const distPresionVisible = useMemo(
    () => distPresion.map((d) => ({
      ...d,
      Sistólica: seriesPresionOcultas.has("Sistólica") ? 0 : d["Sistólica"],
      Diastólica: seriesPresionOcultas.has("Diastólica") ? 0 : d["Diastólica"],
    })),
    [distPresion, seriesPresionOcultas]
  );

  // Oculto (no eliminado): datos de la gráfica "Sistólica × Diastólica", ver
  // el bloque JSX comentado con el mismo nombre más abajo.
  // const scatterData = useMemo(() => {
  //   return estadoActual
  //     .map((r) => ({ x: obtenerValor(r, "Sistolica"), y: obtenerValor(r, "Diastolica") }))
  //     .filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
  // }, [estadoActual]);

  const sistolicaPorDepto = useMemo(
    () => promedioPorGrupo(estadoActual, "Sistolica", (r) => r.Depto_nombre).slice(0, 10),
    [estadoActual]
  );

  // Estadios de presión arterial (ACC/AHA), a partir de Sistólica + Diastólica combinadas.
  const estadiosPresion = useMemo(() => {
    const conteo = new Map<string, number>();
    estadoActual.forEach((r) => {
      const sist = obtenerValor(r, "Sistolica");
      const diast = obtenerValor(r, "Diastolica");
      if (sist == null || diast == null) return;
      const { label } = clasificarPresion(sist, diast);
      conteo.set(label, (conteo.get(label) ?? 0) + 1);
    });
    return ORDEN_PRESION.map((label) => ({ label, count: conteo.get(label) ?? 0 }));
  }, [estadoActual]);
  const totalConPresion = estadiosPresion.reduce((acc, e) => acc + e.count, 0);

  // Igual que distribucionIctVisible: los estadios ocultos por la leyenda se
  // fuerzan a 0 para que su porción desaparezca de la dona.
  const estadiosPresionVisible = useMemo(
    () => estadiosPresion.map((e) => (estadiosPresionOcultos.has(e.label) ? { ...e, count: 0 } : e)),
    [estadiosPresion, estadiosPresionOcultos]
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-flow-dense gap-6">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-2">
            <i className="fa-solid fa-chart-simple mr-2"></i>Distribución presión arterial
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distPresionVisible} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<TooltipDistPresion />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="Sistólica" name="Sistólica" fill={COLOR_PRESION["Sistólica"]} radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out" />
              <Bar dataKey="Diastólica" name="Diastólica" fill={COLOR_PRESION["Diastólica"]} radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {(["Sistólica", "Diastólica"] as const).map((serie) => {
              const oculto = seriesPresionOcultas.has(serie);
              return (
                <button
                  key={serie}
                  type="button"
                  onClick={() => toggleSeriePresion(serie)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                >
                  <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : COLOR_PRESION[serie] }}></span>
                  {serie}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-2"><i className="fa-solid fa-chart-pie mr-2"></i>Presión arterial (ACC/AHA)</h3>
          {totalConPresion > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={estadiosPresionVisible}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {estadiosPresionVisible.map((e, i) => <Cell key={i} fill={COLOR_ESTADIO_PRESION[e.label]} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const e = payload[0].payload;
                      const pct = totalConPresion ? ((e.count / totalConPresion) * 100).toFixed(1) : "0";
                      return (
                        <div className={tooltipCls}>
                          <p className="font-bold text-gray-700 mb-1">Presión arterial (ACC/AHA)</p>
                          <p className="flex items-center gap-1.5 text-gray-500">
                            <span className="size-2 rounded-full inline-block" style={{ backgroundColor: COLOR_ESTADIO_PRESION[e.label] }}></span>
                            {e.label}: <span className="font-bold text-gray-700">{e.count} ({pct}%)</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {estadiosPresion.map((e) => {
                  const oculto = estadiosPresionOcultos.has(e.label);
                  return (
                    <button
                      key={e.label}
                      type="button"
                      onClick={() => toggleEstadioPresion(e.label)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                    >
                      <span className="size-2 rounded-full inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : COLOR_ESTADIO_PRESION[e.label] }}></span>
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
          )}
        </div>

        {/* Oculto (no eliminado): "Sistólica × Diastólica". Ver `scatterData`
            comentado más arriba.
        <div className="lg:col-span-2 rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-2">Sistólica × Diastólica ({estadoActual.length.toLocaleString("es-MX")} personas)</h3>
          <p className="text-[10px] text-gray-400 mb-2">
            Cada punto representa una persona (estado actual). Líneas verdes: límite normal (120/80). Línea roja: umbral HTA etapa 2 (140).
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name="Sistólica" tick={{ fontSize: 10 }} domain={["dataMin - 5", "dataMax + 5"]} />
              <YAxis type="number" dataKey="y" name="Diastólica" tick={{ fontSize: 10 }} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine x={120} stroke="#10b981" strokeDasharray="4 4" label={{ value: "120", fontSize: 9, fill: "#10b981" }} />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value: "80", fontSize: 9, fill: "#10b981" }} />
              <ReferenceLine x={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "140", fontSize: 9, fill: "#ef4444" }} />
              <Scatter data={scatterData} fill="#005FAA" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        */}

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-2">Sistólica promedio por departamento (top 10)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sistolicaPorDepto} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="promedio" name="Sistólica promedio" fill="#0090D8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

const CardiovascularSection: React.FC<CardiovascularSectionProps> = (props) => (
  <SectionCard icon="heart-pulse" title="Cardiovascular" subtitle="Presión sistólica y diastólica">
    <CardiovascularContenido {...props} />
  </SectionCard>
);

export default CardiovascularSection;
