import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MatrizProtocoloItem } from "../types";
import { formatoMesAnioLargo } from "../rangoAnios";

interface MatrizProtocolosChartProps {
  protocolos: MatrizProtocoloItem[];
}

// Etiquetas fijas Ene→Dic: a diferencia de `HistoricosYGraficas.Meses` (que se
// corta en el mes actual del año en curso), `ConteoMeses` siempre trae 12
// elementos por año, así que el encabezado de la tabla no depende de la prop.
const MESES_ANIO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Tabla histórica de consultas por protocolo y mes, navegable por año — cada
// protocolo es una identidad estable a través de los años (agrupado por
// `Nombre`/`IdProtocolo`, no duplicado por año) y trae un `ConteoPorAnio` con
// los años en que tuvo actividad.
const MatrizProtocolosChart: React.FC<MatrizProtocolosChartProps> = ({ protocolos }) => {
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    protocolos.forEach((p) => p.ConteoPorAnio.forEach((c) => set.add(c.Anio)));
    return Array.from(set).sort((a, b) => a - b);
  }, [protocolos]);

  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    if (aniosDisponibles.length === 0) {
      setAnioSeleccionado(null);
      return;
    }
    const anioActual = new Date().getFullYear();
    setAnioSeleccionado(aniosDisponibles.includes(anioActual) ? anioActual : aniosDisponibles[aniosDisponibles.length - 1]);
  }, [aniosDisponibles]);

  const indice = anioSeleccionado != null ? aniosDisponibles.indexOf(anioSeleccionado) : -1;

  const filasAnio = useMemo(() => {
    if (anioSeleccionado == null) return [];
    return protocolos
      .map((p) => ({ protocolo: p, conteoMeses: p.ConteoPorAnio.find((c) => c.Anio === anioSeleccionado)?.ConteoMeses }))
      .filter((f): f is { protocolo: MatrizProtocoloItem; conteoMeses: number[] } => f.conteoMeses != null);
  }, [protocolos, anioSeleccionado]);

  const { totalesMensuales, granTotal } = useMemo(() => {
    const totales = new Array(12).fill(0);
    let total = 0;
    filasAnio.forEach(({ conteoMeses }) => {
      conteoMeses.forEach((v, i) => { totales[i] += v ?? 0; total += v ?? 0; });
    });
    return { totalesMensuales: totales, granTotal: total };
  }, [filasAnio]);

  if (aniosDisponibles.length === 0) {
    return (
      <div className="rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">
          <i className="fa-solid fa-bars-progress mr-2"></i>Histórico de Consultas
        </h3>
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">Sin protocolos de atención registrados.</div>
      </div>
    );
  }

  const irAnioAnterior = () => indice > 0 && setAnioSeleccionado(aniosDisponibles[indice - 1]);
  const irAnioSiguiente = () => indice < aniosDisponibles.length - 1 && setAnioSeleccionado(aniosDisponibles[indice + 1]);

  return (
    <div className="rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-bars-progress mr-2"></i>Histórico de Consultas
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={irAnioAnterior}
            disabled={indice <= 0}
            title="Año anterior"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 tabular-nums px-1">{anioSeleccionado}</span>
          <button
            onClick={irAnioSiguiente}
            disabled={indice >= aniosDisponibles.length - 1}
            title="Año siguiente"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase pb-2 pr-3">Protocolo</th>
              {MESES_ANIO.map((m) => <th key={m} className="text-center text-[10px] font-bold text-gray-400 uppercase pb-2 px-1">{m}</th>)}
              <th className="text-center text-[10px] font-bold text-sea-blue uppercase pb-2 pl-3 border-l border-gray-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {filasAnio.map(({ protocolo, conteoMeses }) => {
              const total = conteoMeses.reduce((a, b) => a + (b ?? 0), 0);
              return (
                <tr key={protocolo.IdProtocolo} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                    <i className="mdi mdi-stethoscope text-sea-blue mr-1"></i>
                    {protocolo.Nombre}
                  </td>
                  {conteoMeses.map((v, i) => (
                    <td key={i} className="text-center py-1.5 px-1">
                      {v > 0 ? (
                        <span className="inline-flex items-center justify-center size-5 rounded bg-sky-blue/10 text-sky-blue font-bold text-[10px]">{v}</span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  ))}
                  <td className="text-center py-1.5 pl-3 font-bold text-gray-700 border-l border-gray-200">{total}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-bold">
              <td className="pt-2 pr-3 text-gray-600">Total mensual</td>
              {totalesMensuales.map((t, i) => <td key={i} className="text-center pt-2 px-1 text-gray-600">{t}</td>)}
              <td className="text-center pt-2 pl-3 text-sea-blue border-l border-gray-200">{granTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {anioSeleccionado != null && (
        <div className="mt-3 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-xs shrink-0"></i>
          <p className="text-[11px] italic leading-relaxed text-left">
            El contenido mostrado comprende un rango del <b>{formatoMesAnioLargo(new Date(anioSeleccionado, 0, 1))} al {formatoMesAnioLargo(new Date(anioSeleccionado, 11, 1))}</b>.
          </p>
        </div>
      )}
    </div>
  );
};

export default MatrizProtocolosChart;
