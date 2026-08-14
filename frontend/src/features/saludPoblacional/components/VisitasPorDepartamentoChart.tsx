import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { VisitasDepto, agruparDepartamentosPequenos } from "../analytics";

interface VisitasPorDepartamentoChartProps {
  detallePorDepto: VisitasDepto[];
  anioDetalle: number | null;
}

interface SegmentoVista {
  depto: string;
  total: number;
  esOtros: boolean;
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
// alto razonable. Los departamentos con menos de 4% del total se agrupan en
// "Otros" (agruparDepartamentosPequenos) para que ningún segmento quede tan
// chico que no se pueda seleccionar o leer.
//
// Clic en "Otros" NO abre un tooltip/tabla con el desglose — reemplaza el
// gráfico completo, en el mismo lugar, por una segunda gráfica del mismo
// tipo con solo los departamentos que se agruparon ahí (sin volver a aplicar
// el umbral de 4%: en esta vista se listan todos, sin sub-agrupar). Una
// flecha en la cabecera regresa a la vista principal. Esto evita la tabla de
// detalle debajo del gráfico que se usaba antes.
const VisitasPorDepartamentoChart: React.FC<VisitasPorDepartamentoChartProps> = ({ detallePorDepto, anioDetalle }) => {
  const total = useMemo(() => detallePorDepto.reduce((acc, d) => acc + d.total, 0), [detallePorDepto]);
  const segmentosPrincipales = useMemo(() => agruparDepartamentosPequenos(detallePorDepto), [detallePorDepto]);
  const otros = segmentosPrincipales.find((s) => s.esOtros) ?? null;

  const [vistaOtros, setVistaOtros] = useState(false);
  const [deptosOcultos, setDeptosOcultos] = useState<Set<string>>(new Set());
  // Año nuevo (o gráfica sin datos) = dataset distinto por completo: no tiene
  // sentido conservar la sub-vista de "Otros" ni los toggles de leyenda del
  // año anterior.
  useEffect(() => {
    setVistaOtros(false);
    setDeptosOcultos(new Set());
  }, [anioDetalle]);

  const segmentosActivos: SegmentoVista[] = useMemo(() => {
    if (vistaOtros) {
      return otros?.detalle?.map((d) => ({ depto: d.depto, total: d.total, esOtros: false })) ?? [];
    }
    return segmentosPrincipales;
  }, [vistaOtros, otros, segmentosPrincipales]);

  const colorPorDepto = useMemo(() => {
    const mapa = new Map<string, string>();
    let i = 0;
    segmentosActivos.forEach((s) => {
      if (s.esOtros) { mapa.set(s.depto, COLOR_OTROS); return; }
      mapa.set(s.depto, PALETA_DEPTO[i % PALETA_DEPTO.length]);
      i++;
    });
    return mapa;
  }, [segmentosActivos]);

  // Leyenda clicable (mismo patrón que ConsultasPorDepartamentoChart): el
  // segmento oculto se fuerza a total=0 en el dato que se dibuja, sin perder
  // su conteo real en `segmentosActivos`.
  const toggleDepto = (depto: string) => {
    setDeptosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(depto)) next.delete(depto); else next.add(depto);
      return next;
    });
  };
  const segmentosVisibles = useMemo(
    () => segmentosActivos.map((s) => (deptosOcultos.has(s.depto) ? { ...s, total: 0 } : s)),
    [segmentosActivos, deptosOcultos]
  );

  return (
    <div className="rounded-lg p-4 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        {vistaOtros && (
          <button
            type="button"
            onClick={() => setVistaOtros(false)}
            className="w-5 h-5 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer shrink-0"
            aria-label="Regresar a Distribución por departamento"
          >
            <i className="fa-solid fa-arrow-left text-[11px]"></i>
          </button>
        )}
        <h3 className="text-xs font-bold text-gray-600">
          <i className="fa-solid fa-building-user mr-2"></i>
          {vistaOtros ? "Otros" : "Distribución por departamento"}{anioDetalle != null ? ` — ${anioDetalle}` : ""}
        </h3>
      </div>

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
                onClick={(data: any) => { if (data.esOtros) setVistaOtros(true); }}
              >
                {segmentosVisibles.map((s) => <Cell key={s.depto} fill={colorPorDepto.get(s.depto)} />)}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const s = payload[0].payload as SegmentoVista;
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
            {segmentosActivos.map((s) => {
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
        </>
      )}
    </div>
  );
};

export default VisitasPorDepartamentoChart;
