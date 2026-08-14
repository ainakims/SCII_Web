import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EvolucionIMC } from "../types";
import EtiquetaUltimoValor from "./EtiquetaUltimoValor";
import SelectorRangoAnios from "./SelectorRangoAnios";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";
import { RangoAnios, aniosUnicos, anioDeEtiquetaMesAnio, fechaDeEtiquetaMesAnio, formatoMesAnioLargo, rangoPorDefecto } from "../rangoAnios";

interface EvolucionImcChartProps {
  meses: string[];
  evolucion: EvolucionIMC;
}

const COLOR_IMC = "#002E6D";

// Mismo estilo de tooltip que las gráficas de Expediente (Somatometría, Cardiovascular, etc.).
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipImc: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  if (p.imc == null) return null;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p className="flex items-center gap-1.5 text-gray-500">
        <span className="size-2 rounded-full inline-block" style={{ backgroundColor: COLOR_IMC }}></span>
        IMC: <span className="font-bold text-gray-700">{p.imc}</span>
      </p>
    </div>
  );
};

const EvolucionImcChart: React.FC<EvolucionImcChartProps> = ({ meses, evolucion }) => {
  // Rango de años seleccionable (arriba a la derecha del título) — permite
  // comparar dos o más años en vez de ver siempre el histórico completo.
  const aniosDisponibles = useMemo(() => aniosUnicos(meses.map(anioDeEtiquetaMesAnio)), [meses]);
  const [rango, setRango] = useState<RangoAnios | null>(null);
  useEffect(() => {
    setRango((prev) => (prev && aniosDisponibles.includes(prev.desde) && aniosDisponibles.includes(prev.hasta) ? prev : rangoPorDefecto(aniosDisponibles)));
  }, [aniosDisponibles]);

  const serie = useMemo(
    () => meses
      .map((mes, i) => ({ mes, imc: evolucion.ValoresIMC[i] ?? null, anio: anioDeEtiquetaMesAnio(mes) }))
      .filter((p) => rango == null || (p.anio != null && p.anio >= rango.desde && p.anio <= rango.hasta)),
    [meses, evolucion, rango]
  );

  const hayDatos = serie.some((p) => p.imc != null);

  // Rango de fechas efectivamente mostrado (para la leyenda debajo de la
  // gráfica) — puede ser más angosto que el rango de años seleccionado si
  // faltan datos en los extremos.
  const rangoMostrado = useMemo(() => {
    const fechas = serie.map((p) => fechaDeEtiquetaMesAnio(p.mes)).filter((f): f is Date => f != null);
    if (fechas.length === 0) return null;
    return { min: fechas.reduce((a, b) => (b < a ? b : a)), max: fechas.reduce((a, b) => (b > a ? b : a)) };
  }, [serie]);

  // Índice del último registro con IMC: ahí se dibuja la etiqueta "IMC
  // actual" dentro de la gráfica (en vez de un badge en el header).
  const ultimoImcIndex = useMemo(() => {
    for (let i = serie.length - 1; i >= 0; i--) if (serie[i].imc != null) return i;
    return -1;
  }, [serie]);

  // El eje Y arranca cerca del valor mínimo (no en un fijo 18) para que las
  // variaciones de IMC se noten mejor sin importar el rango real de datos.
  const limiteInferiorY = useMemo(() => {
    const valores = serie.map((p) => p.imc).filter((v): v is number => v != null);
    return valores.length ? Math.floor(Math.min(...valores)) - 1 : 18;
  }, [serie]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          <i className="fa-solid fa-scale-balanced text-sea-blue mr-2"></i>Evolución de IMC
        </h3>
        {rango && <SelectorRangoAnios aniosDisponibles={aniosDisponibles} rango={rango} onChange={setRango} />}
      </div>
      {hayDatos ? (
        <>
        <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={serie} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={30} domain={[limiteInferiorY, "auto"]} allowDecimals={false} />
            <Tooltip content={<TooltipImc />} />
            <Line
              type="linear"
              dataKey="imc"
              name="IMC"
              stroke={COLOR_IMC}
              strokeWidth={2.5}
              connectNulls
              animationDuration={900}
              animationEasing="ease-out"
              dot={(props: any) => {
                const { cx, cy, index, payload } = props;
                if (payload.imc == null) return <React.Fragment key={`dot-${index}`} />;
                if (index !== ultimoImcIndex) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={COLOR_IMC} stroke="#fff" strokeWidth={1.5} />;
                return (
                  <g key={`dot-${index}`}>
                    <circle cx={cx} cy={cy} r={4} fill={COLOR_IMC} stroke="#fff" strokeWidth={1.5} />
                    <EtiquetaUltimoValor cx={cx} cy={cy} texto={`IMC actual: ${payload.imc}`} color={COLOR_IMC} />
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
        <ShimmerOverlay />
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
        <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">Sin datos de IMC disponibles.</div>
      )}
    </div>
  );
};

export default EvolucionImcChart;
