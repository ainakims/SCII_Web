import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { RegistroValidado } from "../types";
import { construirEvolucionHistorica, construirSeguimientoLongitudinal, IndicadorClave, MetodoEvolucion } from "../analytics";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

// Tooltip personalizado: un solo eje (el valor), con el tamaño de muestra (n) como
// dato de contexto en texto, en vez de una segunda barra en un eje distinto — el
// combo de dos ejes (valor + n) confundía porque comparten el mismo espacio visual
// con escalas totalmente distintas.
const TooltipEvolucion: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-lg p-3 text-xs border border-gray-100">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-3">
          <span>{p.name}</span>
          <span className="font-semibold">{p.value} {p.payload?.n != null ? `(n=${p.payload.n})` : ""}</span>
        </p>
      ))}
    </div>
  );
};

interface EvolucionHistoricaSectionProps {
  historico: RegistroValidado[];
}

const VARIABLES: { campo: IndicadorClave; label: string }[] = [
  { campo: "IMC", label: "IMC" },
  { campo: "Sistolica", label: "Presión sistólica" },
  { campo: "Diastolica", label: "Presión diastólica" },
  { campo: "Glucosa", label: "Glucosa" },
  { campo: "Colesterol", label: "Colesterol" },
  { campo: "Trigliceridos", label: "Triglicéridos" },
];

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

// Secciones 29, 30 y 31 del documento: evolución histórica de indicadores,
// advirtiendo variaciones en el tamaño de la población evaluada entre periodos,
// y cobertura de seguimiento longitudinal (cuántas evaluaciones tiene cada persona).
const EvolucionHistoricaSection: React.FC<EvolucionHistoricaSectionProps> = ({ historico }) => {
  const [campo, setCampo] = useState<IndicadorClave>("IMC");
  const [metodo, setMetodo] = useState<MetodoEvolucion>("promedio");
  const [periodicidad, setPeriodicidad] = useState<"anio" | "mes">("anio");

  const serie = useMemo(
    () => construirEvolucionHistorica(historico, campo, metodo, periodicidad),
    [historico, campo, metodo, periodicidad]
  );

  const seguimiento = useMemo(() => construirSeguimientoLongitudinal(historico), [historico]);

  const nValores = serie.map((p) => p.n).filter((n) => n > 0);
  const variacionImportante = nValores.length > 1 && Math.max(...nValores) > Math.min(...nValores) * 2;

  // Gráficos headline: evolución de IMC y de presión arterial (PAS/PAD), siempre
  // visibles, independientes del selector genérico de más abajo.
  const evolucionImc = useMemo(() => construirEvolucionHistorica(historico, "IMC", "promedio", "anio"), [historico]);
  const evolucionPresion = useMemo(() => {
    const sistolica = construirEvolucionHistorica(historico, "Sistolica", "promedio", "anio");
    const diastolica = construirEvolucionHistorica(historico, "Diastolica", "promedio", "anio");
    const porPeriodo = new Map<string, { periodo: string; Sistolica?: number | null; Diastolica?: number | null }>();
    sistolica.forEach((p) => porPeriodo.set(p.periodo, { periodo: p.periodo, Sistolica: p.valor }));
    diastolica.forEach((p) => {
      const actual = porPeriodo.get(p.periodo) ?? { periodo: p.periodo };
      actual.Diastolica = p.valor;
      porPeriodo.set(p.periodo, actual);
    });
    return Array.from(porPeriodo.values()).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [historico]);

  return (
    <SectionCard icon="chart-timeline-variant" title="Evolución histórica" subtitle="Serie temporal a partir de todo el historial disponible">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Evolución de IMC promedio</h3>
          {evolucionImc.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucionImc} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip content={<TooltipEvolucion />} />
                <Line type="monotone" dataKey="valor" name="IMC promedio" stroke="#002E6D" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes.</div>
          )}
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Evolución de presión arterial (PAS/PAD)</h3>
          {evolucionPresion.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucionPresion} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Sistolica" name="Sistólica" stroke="#0070BD" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="Diastolica" name="Diastólica" stroke="#009BDE" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes.</div>
          )}
        </div>
      </div>

      <h3 className="text-xs font-bold text-gray-600 mb-3 flex items-center border-t border-gray-100 pt-6">
        <i className="mdi mdi-magnify-scan text-sea-blue mr-2"></i>
        Explorar otro indicador
      </h3>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-48 relative">
          <select className={selectCls} value={campo} onChange={(e) => setCampo(e.target.value as IndicadorClave)}>
            {VARIABLES.map((v) => <option key={v.campo} value={v.campo}>{v.label}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>
        <div className="w-40 relative">
          <select className={selectCls} value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoEvolucion)}>
            <option value="promedio">Promedio</option>
            <option value="mediana">Mediana</option>
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>
        <div className="w-32 relative">
          <select className={selectCls} value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value as "anio" | "mes")}>
            <option value="anio">Por año</option>
            <option value="mes">Por mes</option>
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>
      </div>

      {variacionImportante && (
        <div className="flex items-start gap-2 bg-yellow-50 text-yellow-700 text-[11px] px-3 py-2 rounded-lg mb-4">
          <i className="mdi mdi-alert-outline mt-0.5"></i>
          <span>El número de evaluaciones válidas varía considerablemente entre periodos. Compara las tendencias con cautela: parte del cambio puede deberse a variación en la población evaluada, no en el indicador.</span>
        </div>
      )}

      {serie.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip content={<TooltipEvolucion />} />
            <Line type="monotone" dataKey="valor" name={metodo === "promedio" ? "Promedio" : "Mediana"} stroke="#002E6D" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes para este indicador.</div>
      )}
      <p className="text-[10px] text-gray-400 mt-1">El tamaño de muestra (n) por periodo se muestra al pasar el cursor sobre cada punto.</p>

      <div className="mt-6">
        <h3 className="text-xs font-bold text-gray-600 mb-2 flex items-center">
          <i className="mdi mdi-account-clock-outline text-sea-blue mr-2"></i>
          Seguimiento longitudinal
        </h3>
        <p className="text-[11px] text-gray-400 mb-3">
          Personas con una sola evaluación participan en el estado poblacional actual, pero no evidencian evolución individual.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon="numeric-1-box-outline" label="1 evaluación" value={seguimiento.unaEvaluacion.toLocaleString("es-MX")} />
          <KpiCard icon="numeric-3-box-multiple-outline" label="2-3 evaluaciones" value={seguimiento.dosATresEvaluaciones.toLocaleString("es-MX")} />
          <KpiCard icon="numeric-9-plus-box-outline" label="4+ evaluaciones" value={seguimiento.cuatroOMasEvaluaciones.toLocaleString("es-MX")} />
          <KpiCard icon="counter" label="Promedio evaluaciones/persona" value={seguimiento.promedioEvaluacionesPorPersona} />
        </div>
      </div>
    </SectionCard>
  );
};

export default EvolucionHistoricaSection;
