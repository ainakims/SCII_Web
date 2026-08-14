import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EvolucionPesoAnual } from "../types";
import EtiquetaUltimoValor from "./EtiquetaUltimoValor";
import SelectorRangoAnios from "./SelectorRangoAnios";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";
import { RangoAnios, aniosUnicos, anioDeDDMonYYYY, fechaDeDDMonYYYY, formatoMesAnioLargo, rangoPorDefecto } from "../rangoAnios";

interface EvolucionPesoChartProps {
  datos: EvolucionPesoAnual;
}

const SERIES_PESO = [
  { key: "real", label: "Peso real (kg)", color: "#002E6D" },
  { key: "ideal", label: "Peso ideal (kg)", color: "#009BDE" },
] as const;

// Mismo estilo de tooltip que las gráficas de Expediente (Somatometría, Cardiovascular, etc.).
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

// "01/Mar/2025" -> "Mar 2025": el día no aporta nada aquí (un punto por mes).
function formatearMesAnio(fecha: string): string {
  const partes = fecha.split("/");
  return partes.length === 3 ? `${partes[1]} ${partes[2]}` : fecha;
}

const TooltipPeso: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="font-bold text-gray-700">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const EvolucionPesoChart: React.FC<EvolucionPesoChartProps> = ({ datos }) => {
  // Rango de años seleccionable (arriba a la derecha del título) — permite
  // comparar dos o más años en vez de ver siempre el histórico completo.
  const aniosDisponibles = useMemo(() => aniosUnicos(datos.Fechas.map(anioDeDDMonYYYY)), [datos]);
  const [rango, setRango] = useState<RangoAnios | null>(null);
  useEffect(() => {
    setRango((prev) => (prev && aniosDisponibles.includes(prev.desde) && aniosDisponibles.includes(prev.hasta) ? prev : rangoPorDefecto(aniosDisponibles)));
  }, [aniosDisponibles]);

  const serie = useMemo(
    () => datos.Fechas
      .map((fecha, i) => ({ fecha: formatearMesAnio(fecha), fechaOriginal: fecha, real: datos.PesoReal[i] ?? null, ideal: datos.PesoIdeal[i] ?? null, anio: anioDeDDMonYYYY(fecha) }))
      .filter((p) => rango == null || (p.anio != null && p.anio >= rango.desde && p.anio <= rango.hasta)),
    [datos, rango]
  );

  const hayDatos = serie.some((p) => p.real != null || p.ideal != null);

  // Rango de fechas efectivamente mostrado (para la leyenda debajo de la
  // gráfica) — puede ser más angosto que el rango de años seleccionado si
  // faltan datos en los extremos.
  const rangoMostrado = useMemo(() => {
    const fechas = serie.map((p) => fechaDeDDMonYYYY(p.fechaOriginal)).filter((f): f is Date => f != null);
    if (fechas.length === 0) return null;
    return { min: fechas.reduce((a, b) => (b < a ? b : a)), max: fechas.reduce((a, b) => (b > a ? b : a)) };
  }, [serie]);

  // Índice del último registro con peso ideal: ahí se dibuja la etiqueta
  // "Meta" dentro de la gráfica (en vez de un badge en el header), para que
  // quede claro que corresponde al punto más reciente.
  const ultimoIdealIndex = useMemo(() => {
    for (let i = datos.PesoIdeal.length - 1; i >= 0; i--) if (datos.PesoIdeal[i] != null) return i;
    return -1;
  }, [datos]);
  const meta = ultimoIdealIndex >= 0 ? datos.PesoIdeal[ultimoIdealIndex] : null;

  // El eje Y arranca cerca del valor mínimo (no en 0), igual que en
  // Evolución de IMC, para que las variaciones de peso se noten mejor.
  const limiteInferiorY = useMemo(() => {
    const valores = serie.flatMap((p) => [p.real, p.ideal]).filter((v): v is number => v != null);
    return valores.length ? Math.floor(Math.min(...valores)) - 1 : 0;
  }, [serie]);

  // Series ocultas por clic en la leyenda (mismo toggle mostrar/ocultar que
  // las leyendas de Somatometría/Cardiovascular en Expediente): en vez de un
  // <Legend/> de recharts, se omite el <Line/> correspondiente.
  const [seriesOcultas, setSeriesOcultas] = useState<Set<string>>(new Set());
  const toggleSerie = (key: string) => {
    setSeriesOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          <i className="fa-solid fa-weight-scale text-sea-blue mr-2"></i>Peso Real vs Peso Ideal
        </h3>
        {rango && <SelectorRangoAnios aniosDisponibles={aniosDisponibles} rango={rango} onChange={setRango} />}
      </div>
      {hayDatos ? (
        <>
          <div className="relative overflow-hidden">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={serie} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} unit=" kg" width={38} domain={[limiteInferiorY, "auto"]} allowDecimals={false} />
              <Tooltip content={<TooltipPeso />} />
              {!seriesOcultas.has("real") && (
                <Line type="linear" dataKey="real" name="Peso real (kg)" stroke="#002E6D" strokeWidth={2.5} dot={{ r: 3 }} connectNulls animationDuration={900} animationEasing="ease-out" />
              )}
              {!seriesOcultas.has("ideal") && (
                <Line
                  type="linear"
                  dataKey="ideal"
                  name="Peso ideal (kg)"
                  stroke="#009BDE"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  connectNulls
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    if (index !== ultimoIdealIndex || meta == null) return <React.Fragment key={`dot-ideal-${index}`} />;
                    return (
                      <g key={`dot-ideal-${index}`}>
                        <circle cx={cx} cy={cy} r={4} fill="#009BDE" stroke="#fff" strokeWidth={1.5} />
                        <EtiquetaUltimoValor cx={cx} cy={cy} texto={`Meta: ${meta} kg`} color="#009BDE" />
                      </g>
                    );
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <ShimmerOverlay />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {SERIES_PESO.map((s) => {
              const oculto = seriesOcultas.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSerie(s.key)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                >
                  <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : s.color }}></span>
                  {s.label}
                </button>
              );
            })}
          </div>
          {rangoMostrado && (
            <div className="mt-3 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-xs shrink-0"></i>
              <p className="text-[11px] italic leading-relaxed text-left">
                El contenido mostrado comprende un rango del <b>{formatoMesAnioLargo(rangoMostrado.min)} al {formatoMesAnioLargo(rangoMostrado.max)}</b>.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">Sin datos de peso disponibles.</div>
      )}
    </div>
  );
};

export default EvolucionPesoChart;
