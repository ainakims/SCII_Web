import React, { useMemo, useState } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador, obtenerValor, calcularCoberturaCalidad, construirRelacion, IndicadorClave } from "../analytics";
import { clasificarGlucosa, clasificarColesterol, clasificarTrigliceridos, UMBRALES_LABORATORIO, NIVEL_ESTILOS, Nivel, Clasificacion } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import QualityBadge from "./shared/QualityBadge";

interface MetabolicoSectionProps {
  estadoActual: RegistroValidado[];
}

const VARIABLES_METABOLICAS: { campo: IndicadorClave; label: string }[] = [
  { campo: "Glucosa", label: "Glucosa" },
  { campo: "Colesterol", label: "Colesterol" },
  { campo: "Trigliceridos", label: "Triglicéridos" },
];

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

// Explorador interactivo: dispersión entre dos indicadores metabólicos, con líneas
// de umbral de laboratorio superpuestas según el indicador elegido en cada eje.
const ExploradorMetabolico: React.FC<{ estadoActual: RegistroValidado[] }> = ({ estadoActual }) => {
  const [varX, setVarX] = useState<IndicadorClave>("Glucosa");
  const [varY, setVarY] = useState<IndicadorClave>("Trigliceridos");

  const puntos = useMemo(() => construirRelacion(estadoActual, varX, varY), [estadoActual, varX, varY]);
  const umbralesX = UMBRALES_LABORATORIO[varX];
  const umbralesY = UMBRALES_LABORATORIO[varY];

  return (
    <div className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50 mb-4">
      <h3 className="text-sm font-bold text-gray-800 flex items-center mb-3">
        <i className="mdi mdi-chart-scatter-plot text-sea-blue mr-2"></i>
        Explorador de dispersión metabólico
      </h3>
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="w-40 relative">
          <select className={selectCls} value={varX} onChange={(e) => setVarX(e.target.value as IndicadorClave)}>
            {VARIABLES_METABOLICAS.map((v) => <option key={v.campo} value={v.campo}>{v.label}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>
        <div className="w-40 relative">
          <select className={selectCls} value={varY} onChange={(e) => setVarY(e.target.value as IndicadorClave)}>
            {VARIABLES_METABOLICAS.map((v) => <option key={v.campo} value={v.campo}>{v.label}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="x" name={varX} tick={{ fontSize: 10 }} label={{ value: `${varX} (mg/dL)`, position: "insideBottom", offset: -4, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={varY} tick={{ fontSize: 10 }} label={{ value: `${varY} (mg/dL)`, angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {umbralesX && (
            <>
              <ReferenceLine x={umbralesX[0]} stroke="#f59e0b" strokeDasharray="4 4" />
              <ReferenceLine x={umbralesX[1]} stroke="#ef4444" strokeDasharray="4 4" />
            </>
          )}
          {umbralesY && (
            <>
              <ReferenceLine y={umbralesY[0]} stroke="#f59e0b" strokeDasharray="4 4" />
              <ReferenceLine y={umbralesY[1]} stroke="#ef4444" strokeDasharray="4 4" />
            </>
          )}
          <Scatter data={puntos} fill="#0070BD" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-400 mt-1">
        Ámbar: valor alterado/límite. Rojo: alto riesgo / criterio diagnóstico. {puntos.length.toLocaleString("es-MX")} personas con ambos valores disponibles.
      </p>
    </div>
  );
};

const NIVEL_COLOR: Record<Nivel, string> = {
  bajo: "#009BDE",
  normal: "#22c55e",
  leve: "#eab308",
  alto: "#ef4444",
  critico: "#991b1b",
  sin_dato: "#9ca3af",
};

interface BloqueProps {
  titulo: string;
  icono: string;
  campo: IndicadorClave;
  unidad: string;
  clasificador: (valor: number | null) => Clasificacion;
  estadoActual: RegistroValidado[];
}

const BloqueIndicador: React.FC<BloqueProps> = ({ titulo, icono, campo, unidad, clasificador, estadoActual }) => {
  const cobertura = useMemo(() => calcularCoberturaCalidad(estadoActual, campo), [estadoActual, campo]);
  const umbrales = UMBRALES_LABORATORIO[campo];

  const clasificacion = useMemo(() => {
    const conteo = new Map<string, { count: number; nivel: Nivel }>();
    estadoActual.forEach((r) => {
      const valor = obtenerValor(r, campo);
      if (valor == null) return;
      const { label, nivel } = clasificador(valor);
      const actual = conteo.get(label);
      conteo.set(label, { count: (actual?.count ?? 0) + 1, nivel });
    });
    return Array.from(conteo.entries()).map(([label, v]) => ({ label, ...v }));
  }, [estadoActual, campo, clasificador]);

  // Valores individuales (una persona = un punto), para ver de un vistazo quién
  // está dentro/fuera de cada umbral de laboratorio.
  const puntosIndividuales = useMemo(() => {
    return estadoActual
      .map((r, i) => {
        const valor = obtenerValor(r, campo);
        return valor == null ? null : { x: i, y: valor, nivel: clasificador(valor).nivel };
      })
      .filter((p): p is { x: number; y: number; nivel: Nivel } => p != null);
  }, [estadoActual, campo, clasificador]);

  return (
    <div className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          <i className={`mdi mdi-${icono} text-sea-blue mr-2`}></i>
          {titulo}
        </h3>
        <div className="flex items-center gap-1.5">
          <QualityBadge label={`Cobertura ${cobertura.coberturaPct}%`} nivel={cobertura.coberturaPct >= 70 ? "normal" : cobertura.coberturaPct >= 40 ? "leve" : "alto"} />
          <QualityBadge label={`Calidad ${cobertura.calidadPct}% (${cobertura.validos}/${cobertura.totalEvaluado})`} nivel={cobertura.calidadPct >= 70 ? "normal" : cobertura.calidadPct >= 40 ? "leve" : "alto"} />
        </div>
      </div>

      {clasificacion.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {clasificacion.map((c) => (
            <span key={c.label} className={`px-2 py-1 rounded-lg text-[9px] font-semibold ${NIVEL_ESTILOS[c.nivel]}`}>
              {c.label}: {c.count}
            </span>
          ))}
        </div>
      )}

      {/* Valores individuales: cada punto es una persona, con los umbrales de
          laboratorio marcados como líneas horizontales sobre el valor. */}
      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Valores individuales</h4>
      {puntosIndividuales.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" hide domain={[-1, puntosIndividuales.length]} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} label={{ value: unidad, angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: any) => [`${value} ${unidad}`, titulo]} labelFormatter={() => ""} />
              {umbrales && (
                <>
                  <ReferenceLine y={umbrales[0]} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${umbrales[0]}`, fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                  <ReferenceLine y={umbrales[1]} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${umbrales[1]}`, fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
                </>
              )}
              <Scatter data={puntosIndividuales}>
                {puntosIndividuales.map((p, i) => <Cell key={i} fill={NIVEL_COLOR[p.nivel]} fillOpacity={0.75} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {umbrales && (
            <p className="text-[10px] text-gray-400 mt-1">
              Ámbar ({umbrales[0]} {unidad}): valor alterado/límite. Rojo ({umbrales[1]} {unidad}): alto riesgo / criterio diagnóstico. Cada punto es una persona.
            </p>
          )}
        </>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
      )}
    </div>
  );
};

// Sección 26 del documento: Glucosa, Colesterol, Triglicéridos.
// No se calcula ninguna media usando valores no numéricos (los estados
// PENDIENTE/NO_APLICA/INVALIDO/FALTANTE quedan excluidos por analytics.ts).
const MetabolicoSection: React.FC<MetabolicoSectionProps> = ({ estadoActual }) => (
  <SectionCard icon="water-outline" title="Metabólico" subtitle="Glucosa, colesterol y triglicéridos (estado actual)">
    <ExploradorMetabolico estadoActual={estadoActual} />
    <div className="grid grid-cols-1 gap-4">
      <BloqueIndicador titulo="Glucosa" icono="water" campo="Glucosa" unidad="mg/dL" clasificador={clasificarGlucosa} estadoActual={estadoActual} />
      <BloqueIndicador titulo="Colesterol" icono="virus" campo="Colesterol" unidad="mg/dL" clasificador={clasificarColesterol} estadoActual={estadoActual} />
      <BloqueIndicador titulo="Triglicéridos" icono="atom-variant" campo="Trigliceridos" unidad="mg/dL" clasificador={clasificarTrigliceridos} estadoActual={estadoActual} />
    </div>
  </SectionCard>
);

export default MetabolicoSection;
