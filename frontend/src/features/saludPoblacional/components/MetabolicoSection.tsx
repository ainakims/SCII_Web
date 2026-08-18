import React, { useMemo, useState } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador, obtenerValor, construirRelacion, IndicadorClave } from "../analytics";
import { UMBRALES_LABORATORIO, Nivel } from "../clinicalRules";
import { generarResumenMedico } from "../resumenMedico";
import { useIrAPacientesConEntradas, useIrAPacientesFiltrados } from "../useIrAPacientesFiltrados";
import SectionCard from "./shared/SectionCard";
import ShimmerOverlay from "./shared/ShimmerOverlay";

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

// Mismo estilo de tooltip que el resto de las gráficas del dashboard.
const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

// Explorador interactivo: dispersión entre dos indicadores metabólicos, con líneas
// de umbral de laboratorio superpuestas según el indicador elegido en cada eje.
const ExploradorMetabolico: React.FC<{ estadoActual: RegistroValidado[] }> = ({ estadoActual }) => {
  const [varX, setVarX] = useState<IndicadorClave>("Glucosa");
  const [varY, setVarY] = useState<IndicadorClave>("Trigliceridos");
  // Cada punto ya es una sola persona (construirRelacion no agrupa por nada,
  // a diferencia de los buckets clínicos de BloqueIndicador) — el clic filtra
  // directo a esa persona, no hay "departamento" ni categoría que agrupar aquí.
  const irAPacientesConEntradas = useIrAPacientesConEntradas();

  const puntos = useMemo(() => construirRelacion(estadoActual, varX, varY), [estadoActual, varX, varY]);
  const umbralesX = UMBRALES_LABORATORIO[varX];
  const umbralesY = UMBRALES_LABORATORIO[varY];

  return (
    <div className="p-4 rounded-xl border border-gray-200 shadow-md bg-linear-to-b from-white to-gray-50 mb-4">
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
      <div className="relative overflow-hidden">
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
          <Scatter
            data={puntos}
            fill="#0070BD"
            fillOpacity={0.6}
            style={{ cursor: "pointer" }}
            onClick={(entry: any) => {
              const p = entry?.payload ?? entry;
              if (!p?.matricula) return;
              irAPacientesConEntradas(
                `${varX} ${p.x} · ${varY} ${p.y}`,
                "metabolico",
                varX,
                [{ matricula: p.matricula, texto: `${p.x} mg/dL`, valor: p.x, fecha: p.fecha }]
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <ShimmerOverlay subtle />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        Ámbar: valor alterado/límite. Rojo: alto riesgo / criterio diagnóstico. {puntos.length.toLocaleString("es-MX")} personas con ambos valores disponibles.
      </p>
    </div>
  );
};

const NIVEL_COLOR: Record<Nivel, string> = {
  bajo: "#009BDE",
  normal: "#54BBAB",
  leve: "#FFC627",
  alto: "#EE7523",
  critico: "#991b1b",
  sin_dato: "#9ca3af",
};

// Clasificación simplificada por umbral de laboratorio (los mismos dos cortes
// que ya se dibujan como ReferenceLine ámbar/rojo en cada bloque), en vez de
// las categorías clínicas finas (Normal/Prediabetes/Diabetes, etc.) que tenía
// antes cada indicador — a pedido del usuario, resulta más simple de evaluar
// de un vistazo: 3 franjas fijas en vez de 3-4 categorías con nombres
// distintos por indicador.
function clasificarPorUmbral(valor: number, umbrales: [number, number] | undefined): { label: string; nivel: Nivel } {
  if (!umbrales) return { label: "Sin dato", nivel: "sin_dato" };
  if (valor < umbrales[0]) return { label: "Dentro de rango normal", nivel: "normal" };
  if (valor < umbrales[1]) return { label: "Valor limítrofe", nivel: "leve" };
  return { label: "Valor elevado", nivel: "alto" };
}

interface BloqueProps {
  titulo: string;
  icono: string;
  campo: IndicadorClave;
  unidad: string;
  estadoActual: RegistroValidado[];
}

const BloqueIndicador: React.FC<BloqueProps> = ({ titulo, icono, campo, unidad, estadoActual }) => {
  const umbrales = UMBRALES_LABORATORIO[campo];
  const irAPacientesFiltrados = useIrAPacientesFiltrados();

  // Valores individuales (una persona = un punto), para ver de un vistazo quién
  // está dentro/fuera de cada umbral de laboratorio.
  const puntosIndividuales = useMemo(() => {
    return estadoActual
      .map((r, i) => {
        const valor = obtenerValor(r, campo);
        if (valor == null) return null;
        const { nivel, label } = clasificarPorUmbral(valor, umbrales);
        return { x: i, y: valor, nivel, label, matricula: r.Matricula };
      })
      .filter((p): p is { x: number; y: number; nivel: Nivel; label: string; matricula: string } => p != null);
  }, [estadoActual, campo, umbrales]);

  // Agrupa por la misma franja del punto ("Debajo/En/Encima del umbral"), no
  // por posición en el eje X (que solo es el índice del arreglo, sin
  // significado): clic en cualquier punto de esa franja filtra a todo el grupo.
  const registrosPorLabel = useMemo(() => {
    const mapa = new Map<string, RegistroValidado[]>();
    estadoActual.forEach((r) => {
      const valor = obtenerValor(r, campo);
      if (valor == null) return;
      const { label } = clasificarPorUmbral(valor, umbrales);
      const arr = mapa.get(label) ?? [];
      arr.push(r);
      mapa.set(label, arr);
    });
    return mapa;
  }, [estadoActual, campo, umbrales]);

  const fmtTexto = useMemo(() => (r: RegistroValidado) => {
    const valor = obtenerValor(r, campo);
    return `${titulo} ${valor ?? "—"} ${unidad}`;
  }, [campo, titulo, unidad]);

  return (
    <div className="p-4 rounded-xl shadow-xl bg-linear-to-b from-white to-gray-50">
      <div className="flex items-center mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          <i className={`mdi mdi-${icono} text-sea-blue mr-2`}></i>
          {titulo}
        </h3>
      </div>

      {puntosIndividuales.length > 0 ? (
        <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={127}>
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" hide domain={[-1, puntosIndividuales.length]} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }: any) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div className={tooltipCls}>
                    <p className="font-bold text-gray-700 mb-1">{titulo}</p>
                    <p className="flex items-center gap-1.5 text-gray-500">
                      <span className="size-2 rounded-full inline-block" style={{ backgroundColor: NIVEL_COLOR[p.nivel] }}></span>
                      <span className="font-bold text-gray-700">{p.y} {unidad}</span>
                    </p>
                  </div>
                );
              }}
            />
            {umbrales && (
              <>
                <ReferenceLine y={umbrales[0]} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${umbrales[0]}`, fontSize: 9, fill: "#f59e0b", position: "insideTopLeft" }} />
                <ReferenceLine y={umbrales[1]} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${umbrales[1]}`, fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
              </>
            )}
            <Scatter
              data={puntosIndividuales}
              style={{ cursor: "pointer" }}
              onClick={(entry: any) => {
                const p = entry?.payload ?? entry;
                if (!p?.label) return;
                irAPacientesFiltrados(`${titulo} · ${p.label}`, "metabolico", titulo, registrosPorLabel.get(p.label) ?? [], fmtTexto, (r) => obtenerValor(r, campo));
              }}
            >
              {puntosIndividuales.map((p, i) => <Cell key={i} fill={NIVEL_COLOR[p.nivel]} fillOpacity={0.75} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <ShimmerOverlay subtle />
        </div>
      ) : (
        <div className="h-[145px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
      )}
    </div>
  );
};

// Sección 26 del documento: Glucosa, Colesterol, Triglicéridos.
// No se calcula ninguna media usando valores no numéricos (los estados
// PENDIENTE/NO_APLICA/INVALIDO/FALTANTE quedan excluidos por analytics.ts).
export const MetabolicoContenido: React.FC<MetabolicoSectionProps> = ({ estadoActual }) => {
  const resumen = useMemo(() => generarResumenMedico(estadoActual), [estadoActual]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        <BloqueIndicador titulo="Glucosa" icono="water" campo="Glucosa" unidad="mg/dL" estadoActual={estadoActual} />
        <BloqueIndicador titulo="Colesterol" icono="virus" campo="Colesterol" unidad="mg/dL" estadoActual={estadoActual} />
        <BloqueIndicador titulo="Triglicéridos" icono="atom-variant" campo="Trigliceridos" unidad="mg/dL" estadoActual={estadoActual} />
      </div>
      <div className="flex items-start gap-2 bg-horz-blue/15 text-yellow-700 text-[11px] px-3 py-2 rounded-lg mt-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-blue/10 shrink-0">
          <i className="mdi mdi-creation text-sea-blue text-base animate-pulse"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sea-blue uppercase tracking-wide mb-1">
            Cobertura metabólica
          </p>
          <p className="text-xs text-sea-blue leading-relaxed line-clamp-2 min-h-[2.4rem]">{resumen?.coberturaMetabolica}</p>
        </div>
      </div>
    </>
  );
};

const MetabolicoSection: React.FC<MetabolicoSectionProps> = (props) => (
  <SectionCard icon="water-outline" title="Metabólico" subtitle="Glucosa, colesterol y triglicéridos (estado actual)">
    <MetabolicoContenido {...props} />
  </SectionCard>
);

export default MetabolicoSection;
