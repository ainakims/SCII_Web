import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { VisitasDepto, agruparDepartamentosPequenos } from "../analytics";

interface VisitasPorDepartamentoChartProps {
  detallePorDepto: VisitasDepto[];
  anioDetalle: number | null;
}

// Paleta categórica por departamento — mismo criterio que PALETA_DEPTO en
// ConsultasPorDepartamentoChart/AntropometriaSection. "Otros" siempre usa el
// gris "sin dato" del resto del dashboard, no un color de la paleta.
const PALETA_DEPTO = ["#009BDE", "#54BBAB", "#FFC627", "#EE7523", "#8B5CF6", "#EC4899", "#22C55E", "#F97316", "#0EA5E9", "#A855F7"];
const COLOR_OTROS = "#9ca3af";

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

// Estilo "Straight Angle Pie Chart" de Recharts (semicírculo apoyado en la
// base: startAngle=180/endAngle=0, cy en el borde inferior) en vez de barras
// horizontales — con muchos departamentos las barras se salían de cualquier
// alto razonable (ver VisitasPorDepartamentoChart anterior). Los
// departamentos con menos de 4% del total se agrupan en "Otros"
// (agruparDepartamentosPequenos) para que ningún segmento quede tan chico
// que no se pueda seleccionar o leer.
const VisitasPorDepartamentoChart: React.FC<VisitasPorDepartamentoChartProps> = ({ detallePorDepto, anioDetalle }) => {
  const total = useMemo(() => detallePorDepto.reduce((acc, d) => acc + d.total, 0), [detallePorDepto]);
  const segmentos = useMemo(() => agruparDepartamentosPequenos(detallePorDepto), [detallePorDepto]);

  // El desglose de "Otros" no puede vivir en el Tooltip flotante de Recharts:
  // ese tooltip tiene pointer-events:none por diseño (para no estorbar al
  // gráfico), así que el mouse nunca puede hacer scroll dentro de él aunque
  // el contenido se corte. Por eso clic en una porción la "fija" y el
  // desglose real se muestra en un panel normal debajo del gráfico — un
  // <div> de verdad, no un overlay, donde el scroll sí funciona.
  const [pinDepto, setPinDepto] = useState<string | null>(null);
  const segmentoPin = segmentos.find((s) => s.depto === pinDepto) ?? null;

  const colorPorDepto = useMemo(() => {
    const mapa = new Map<string, string>();
    let i = 0;
    segmentos.forEach((s) => {
      if (s.esOtros) { mapa.set(s.depto, COLOR_OTROS); return; }
      mapa.set(s.depto, PALETA_DEPTO[i % PALETA_DEPTO.length]);
      i++;
    });
    return mapa;
  }, [segmentos]);

  // Leyenda clicable (mismo patrón que ConsultasPorDepartamentoChart): el
  // segmento oculto se fuerza a total=0 en el dato que se dibuja, sin perder
  // su conteo real en `segmentos` (el botón de la leyenda sigue mostrando su
  // color/nombre aunque esté "apagado").
  const [deptosOcultos, setDeptosOcultos] = useState<Set<string>>(new Set());
  const toggleDepto = (depto: string) => {
    setDeptosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(depto)) next.delete(depto); else next.add(depto);
      return next;
    });
    setPinDepto((prev) => (prev === depto ? null : prev));
  };
  const segmentosVisibles = useMemo(
    () => segmentos.map((s) => (deptosOcultos.has(s.depto) ? { ...s, total: 0 } : s)),
    [segmentos, deptosOcultos]
  );

  return (
    <div className="rounded-lg p-4 flex-1 min-w-0">
      <h3 className="text-xs font-bold text-gray-600 mb-2">
        <i className="fa-solid fa-building-user mr-2"></i>
        Distribución por departamento{anioDetalle != null ? ` — ${anioDetalle}` : ""}
      </h3>

      {anioDetalle == null ? (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-2 px-6">
          <i className="fa-solid fa-hand-pointer text-gray-300 text-xl"></i>
          <p className="text-xs text-gray-400">
            Selecciona una barra en <span className="font-semibold text-gray-500">Asistencia anual</span> para ver el detalle por departamento de ese periodo.
          </p>
        </div>
      ) : detallePorDepto.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-gray-400 text-center px-6">
          Sin visitas registradas ese año.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={segmentosVisibles}
                dataKey="total"
                nameKey="depto"
                startAngle={180}
                endAngle={0}
                cx="50%"
                cy="95%"
                innerRadius="55%"
                outerRadius="130%"
                paddingAngle={2}
                animationDuration={900}
                animationEasing="ease-out"
                cursor="pointer"
                onClick={(data: any) => setPinDepto((prev) => (prev === data.depto ? null : data.depto))}
              >
                {segmentosVisibles.map((s) => <Cell key={s.depto} fill={colorPorDepto.get(s.depto)} />)}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const s = payload[0].payload as (typeof segmentos)[number];
                  const pct = total ? ((s.total / total) * 100).toFixed(1) : "0";
                  return (
                    <div className={tooltipCls}>
                      <p className="font-bold text-gray-700">{s.depto} — {s.total} visitas ({pct}%)</p>
                      {s.esOtros && <p className="text-gray-400 mt-0.5">Clic para ver el desglose</p>}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">
            {segmentos.map((s) => {
              const oculto = deptosOcultos.has(s.depto);
              const color = colorPorDepto.get(s.depto);
              return (
                <button
                  key={s.depto}
                  type="button"
                  onClick={() => toggleDepto(s.depto)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                >
                  <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : color }}></span>
                  {s.depto}
                </button>
              );
            })}
          </div>

          {segmentoPin && (
            <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">
                {segmentoPin.depto} — {segmentoPin.total} visitas ({total ? ((segmentoPin.total / total) * 100).toFixed(1) : "0"}%)
              </p>
              {segmentoPin.esOtros && segmentoPin.detalle ? (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {segmentoPin.detalle.map((d) => (
                    <li key={d.depto} className="flex items-center justify-between text-[11px] text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block bg-gray-400"></span>
                        {d.depto}
                      </span>
                      <span className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded bg-gray-200 text-gray-600 font-bold text-[10px]">
                        {d.total}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-gray-400">Sin desglose adicional para este departamento.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisitasPorDepartamentoChart;
