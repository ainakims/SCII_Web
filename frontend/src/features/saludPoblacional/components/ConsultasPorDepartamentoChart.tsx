import React, { useMemo, useState } from "react";
import { ConsultasDepto } from "../analytics";
import ShimmerOverlay from "./shared/ShimmerOverlay";

interface ConsultasPorDepartamentoChartProps {
  datos: ConsultasDepto[];
  anios: number[];
  anio: number | null;
  onCambiarAnio: (anio: number) => void;
}

// Paleta categórica por departamento (identidad, no severidad clínica) — se
// repite si hay más departamentos que colores, mismo criterio que
// PALETA_DEPTO en AntropometriaSection.tsx.
const PALETA_DEPTO = ["#009BDE", "#54BBAB", "#FFC627", "#EE7523", "#8B5CF6", "#EC4899", "#22C55E", "#F97316", "#0EA5E9", "#A855F7"];

const selectCls = "text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer";

// Geometría de la dona en un viewBox fijo (escala responsiva vía SVG
// width="100%"), no ResponsiveContainer de Recharts — el callout con línea
// guía necesita coordenadas propias que Recharts no expone. El viewBox deja
// ~65px de margen a cada lado del anillo para el callout: sin ese margen, en
// una columna angosta (fila de 3 gráficas) el texto del callout se sale del
// área que el contenedor "overflow-hidden" recorta, y nombres largos de
// departamento quedan cortados por el inicio (ver bug real con "TECNOLOGIAS
// DE LA INFORMACION" recortado a "LOGIAS DE LA INFORMACION").
const VIEWBOX_W = 380;
const VIEWBOX_H = 236;
const CX = VIEWBOX_W / 2;
const CY = 118;
const R_INNER = 46;
const R_OUTER = 72;
const EXPLODE = 9;
const CALLOUT_R = R_OUTER + 26;
const GAP_DEG = 1.5;
const RAD = Math.PI / 180;
const MAX_LINE_CHARS = 16;

function polar(r: number, angleDeg: number) {
  const a = (angleDeg - 90) * RAD;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function arcPath(rI: number, rO: number, startAngle: number, endAngle: number) {
  const p0 = polar(rO, startAngle);
  const p1 = polar(rO, endAngle);
  const p2 = polar(rI, endAngle);
  const p3 = polar(rI, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${rO} ${rO} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rI} ${rI} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

// Nombres de departamento largos ("TECNOLOGIAS DE LA INFORMACION") se parten
// en hasta 2 líneas en vez de dejarlos en una sola línea que se sale del
// viewBox — la 2ª línea absorbe el resto aunque exceda MAX_LINE_CHARS, para
// no truncar el nombre real.
function partirEtiqueta(texto: string, maxChars = MAX_LINE_CHARS): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (candidata.length > maxChars && actual && lineas.length === 0) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, 2);
}

interface Segmento {
  depto: ConsultasDepto;
  color: string;
  startAngle: number;
  endAngle: number;
  mid: number;
  pct: string;
}

const ConsultasPorDepartamentoChart: React.FC<ConsultasPorDepartamentoChartProps> = ({ datos, anios, anio, onCambiarAnio }) => {
  // pinIndex = fijado con clic (persiste, abre el detalle de protocolos).
  // hoverIndex = pasajero, solo aplica cuando nada está fijado.
  const [pinIndex, setPinIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Leyenda clicable (mismo patrón que "Categoría de la OMS" en
  // AntropometriaSection.tsx): el departamento oculto se fuerza a total=0 en
  // el dato que se dibuja, sin perder su conteo real en `datos`.
  const [deptosOcultos, setDeptosOcultos] = useState<Set<string>>(new Set());
  const toggleDepto = (depto: string) => {
    setDeptosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(depto)) next.delete(depto); else next.add(depto);
      return next;
    });
    setPinIndex((prev) => {
      if (prev === null) return prev;
      return datos[prev]?.depto === depto ? null : prev;
    });
  };

  // El total del denominador de "%" siempre usa `datos` completo, no lo
  // visible — ocultar un departamento de la leyenda no debe cambiar el % de
  // los demás.
  const total = useMemo(() => datos.reduce((acc, d) => acc + d.total, 0), [datos]);

  const segmentos = useMemo<Segmento[]>(() => {
    let angle = 0;
    return datos.map((d, i) => {
      const totalVisible = deptosOcultos.has(d.depto) ? 0 : d.total;
      const sweep = total ? (totalVisible / total) * 360 : 0;
      const startAngle = angle;
      const endAngle = angle + Math.max(sweep - GAP_DEG, 0);
      angle += sweep;
      return {
        depto: d,
        color: PALETA_DEPTO[i % PALETA_DEPTO.length],
        startAngle,
        endAngle,
        mid: (startAngle + endAngle) / 2,
        pct: total ? ((d.total / total) * 100).toFixed(1) : "0",
      };
    });
  }, [datos, deptosOcultos, total]);

  const activeIndex = pinIndex ?? hoverIndex;
  const activo = activeIndex != null ? segmentos[activeIndex] : null;

  if (datos.length === 0) {
    return (
      <div className="rounded-lg p-4 flex-1 min-w-0">
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
    <div className="rounded-lg p-4 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-stethoscope mr-2"></i>Consultas por departamento
        </h3>
        <select className={selectCls} value={anio ?? ""} onChange={(e) => onCambiarAnio(Number(e.target.value))}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="relative overflow-hidden">
        <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} width="100%" height={236} style={{ overflow: "visible" }}>
          {segmentos.map((s, i) => {
            const seleccionado = activeIndex === i;
            const dx = seleccionado ? EXPLODE * Math.cos((s.mid - 90) * RAD) : 0;
            const dy = seleccionado ? EXPLODE * Math.sin((s.mid - 90) * RAD) : 0;
            const pStart = polar(R_OUTER, s.mid);
            const pMid = polar(CALLOUT_R - 12, s.mid);
            const pEnd = polar(CALLOUT_R, s.mid);
            const labelRight = pEnd.x > CX;
            const pElbow = { x: pEnd.x + (labelRight ? 14 : -14), y: pEnd.y };
            const lineasNombre = partirEtiqueta(s.depto.depto);
            const yNombreBase = pElbow.y - 3 - (lineasNombre.length - 1) * 11;
            const yValor = yNombreBase + lineasNombre.length * 11 + 3;

            return (
              <g key={s.depto.depto}>
                <g
                  style={{
                    transform: `translate(${dx}px, ${dy}px)`,
                    transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 200ms",
                    filter: seleccionado ? "brightness(1.06)" : undefined,
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => { if (pinIndex === null) setHoverIndex(i); }}
                  onMouseLeave={() => { if (pinIndex === null) setHoverIndex(null); }}
                  onClick={() => {
                    setPinIndex((prev) => (prev === i ? null : i));
                    setHoverIndex(null);
                  }}
                >
                  <path d={arcPath(R_INNER, R_OUTER, s.startAngle, s.endAngle)} fill={s.color} />
                </g>
                <g style={{ opacity: seleccionado ? 1 : 0, transition: "opacity 180ms", pointerEvents: "none" }}>
                  <path
                    d={`M ${pStart.x} ${pStart.y} L ${pMid.x} ${pMid.y} L ${pElbow.x} ${pElbow.y}`}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.5}
                  />
                  <circle cx={pStart.x} cy={pStart.y} r={2.5} fill={s.color} />
                  {lineasNombre.map((linea, li) => (
                    <text
                      key={li}
                      x={pElbow.x + (labelRight ? 4 : -4)}
                      y={yNombreBase + li * 11}
                      textAnchor={labelRight ? "start" : "end"}
                      fontSize={11}
                      fontWeight={700}
                      fill="#374151"
                    >
                      {linea}
                    </text>
                  ))}
                  <text
                    x={pElbow.x + (labelRight ? 4 : -4)}
                    y={yValor}
                    textAnchor={labelRight ? "start" : "end"}
                    fontSize={10}
                    fill="#6b7280"
                  >
                    {s.depto.total} consultas ({s.pct}%)
                  </text>
                </g>
              </g>
            );
          })}
          <text x={CX} y={CY - 3} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1f2937">
            {activo ? activo.depto.total : total}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={9} fill="#9ca3af">
            Consultas
          </text>
        </svg>
        <ShimmerOverlay subtle />
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        {datos.map((d, i) => {
          const oculto = deptosOcultos.has(d.depto);
          const color = PALETA_DEPTO[i % PALETA_DEPTO.length];
          return (
            <button
              key={d.depto}
              type="button"
              onClick={() => toggleDepto(d.depto)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
            >
              <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : color }}></span>
              {d.depto}
            </button>
          );
        })}
      </div>

      {pinIndex != null && segmentos[pinIndex] && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">
            {segmentos[pinIndex].depto.depto} — {segmentos[pinIndex].depto.total} consultas
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {segmentos[pinIndex].depto.protocolos.map((p) => (
              <li key={p.nombre} className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="flex items-center gap-1.5">
                  <i className="mdi mdi-stethoscope text-sea-blue"></i>
                  {p.nombre}
                </span>
                <span
                  className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded font-bold text-[10px]"
                  style={{ backgroundColor: `${segmentos[pinIndex].color}1a`, color: segmentos[pinIndex].color }}
                >
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConsultasPorDepartamentoChart;
