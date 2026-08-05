import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DepartamentoResumen, ComparativoIndicador, Tendencia } from "../resumenMedicoIA";
import { NIVEL_ESTILOS, Nivel } from "../clinicalRules";
import QualityBadge from "./shared/QualityBadge";

interface DepartamentoCardProps {
  depto: DepartamentoResumen;
}

const NIVEL_ALERTA_A_NIVEL: Record<DepartamentoResumen["nivelAlerta"], Nivel> = {
  bajo: "normal",
  moderado: "leve",
  alto: "alto",
};

const COLOR_DONUT: Record<string, string> = {
  sano: "#22c55e",
  moderado: "#eab308",
  alto: "#ef4444",
};

const COLOR_IMC: Record<string, string> = {
  bajoPeso: "#009BDE",
  normopeso: "#22c55e",
  sobrepeso: "#eab308",
  obesidad: "#ef4444",
};

const FILAS_VS_PROMEDIO: { clave: keyof DepartamentoResumen["vsPromedio"]; label: string; esClinico: boolean; tendenciaClave?: keyof DepartamentoResumen["tendencias"] }[] = [
  { clave: "edad", label: "Edad", esClinico: false },
  { clave: "imc", label: "IMC", esClinico: true, tendenciaClave: "imc" },
  { clave: "sistolica", label: "Sistólica", esClinico: true, tendenciaClave: "sistolica" },
  { clave: "glucosa", label: "Glucosa", esClinico: true, tendenciaClave: "glucosa" },
  { clave: "colesterol", label: "Colesterol", esClinico: true, tendenciaClave: "colesterol" },
  { clave: "trigliceridos", label: "Triglicéridos", esClinico: true, tendenciaClave: "trigliceridos" },
  { clave: "riesgoAltoPct", label: "% Riesgo alto", esClinico: true },
];

function colorBarra(comp: ComparativoIndicador, esClinico: boolean): string {
  if (!esClinico || comp.diferenciaPct == null || comp.diferenciaPct <= 0) return "#0070BD";
  if (comp.diferenciaPct >= 15) return "#ef4444";
  if (comp.diferenciaPct >= 5) return "#eab308";
  return "#0070BD";
}

function IconoTendencia({ tendencia }: { tendencia?: Tendencia }) {
  if (!tendencia) return <i className="mdi mdi-minus text-gray-300 text-sm" title="Sin tendencia confiable"></i>;
  if (tendencia.direccion === "alza") return <i className="mdi mdi-trending-up text-red-500 text-sm" title={`Al alza: +${tendencia.cambioPct}%`}></i>;
  if (tendencia.direccion === "baja") return <i className="mdi mdi-trending-down text-sea-blue text-sm" title={`A la baja: ${tendencia.cambioPct}%`}></i>;
  return <i className="mdi mdi-trending-neutral text-gray-400 text-sm" title={`Estable: ${tendencia.cambioPct}%`}></i>;
}

// Card de un departamento (mejora solicitada): números 100% calculados en el
// frontend (ver resumenMedicoIA.ts); `hallazgos` es lo único que llena la IA.
const DepartamentoCard: React.FC<DepartamentoCardProps> = ({ depto }) => {
  const totalRiesgo = depto.distribucionRiesgo.sano + depto.distribucionRiesgo.moderado + depto.distribucionRiesgo.alto;
  const totalImc = depto.distribucionImc.bajoPeso + depto.distribucionImc.normopeso + depto.distribucionImc.sobrepeso + depto.distribucionImc.obesidad;

  const datosRiesgo = [
    { nombre: "Sano", valor: depto.distribucionRiesgo.sano, color: COLOR_DONUT.sano },
    { nombre: "Moderado", valor: depto.distribucionRiesgo.moderado, color: COLOR_DONUT.moderado },
    { nombre: "Alto", valor: depto.distribucionRiesgo.alto, color: COLOR_DONUT.alto },
  ];

  return (
    <div className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-800 truncate" title={depto.nombre}>{depto.nombre}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">{depto.poblacion.toLocaleString("es-MX")} personas</p>
        </div>
        <QualityBadge label={`Alerta ${depto.nivelAlerta}`} nivel={NIVEL_ALERTA_A_NIVEL[depto.nivelAlerta]} />
      </div>

      {(depto.participacionPoblacional.riesgoAltoPct != null || depto.participacionPoblacional.obesidadPct != null) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {depto.participacionPoblacional.riesgoAltoPct != null && (
            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${NIVEL_ESTILOS.alto}`}>
              Concentra {depto.participacionPoblacional.riesgoAltoPct}% del riesgo alto
            </span>
          )}
          {depto.participacionPoblacional.obesidadPct != null && (
            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${NIVEL_ESTILOS.leve}`}>
              Concentra {depto.participacionPoblacional.obesidadPct}% de la obesidad
            </span>
          )}
        </div>
      )}

      {depto.hallazgos.length > 0 ? (
        <ul className="list-disc pl-4 mb-4 space-y-1">
          {depto.hallazgos.map((h, i) => (
            <li key={i} className="text-xs text-gray-600 leading-snug">{h}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-300 italic mb-4">Sin hallazgos generados todavía.</p>
      )}

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Vs. promedio general</p>
      <div className="flex flex-col gap-1.5 mb-4">
        {FILAS_VS_PROMEDIO.map(({ clave, label, esClinico, tendenciaClave }) => {
          const comp = depto.vsPromedio[clave];
          const ancho = comp.diferenciaPct != null ? Math.min(100, Math.abs(comp.diferenciaPct) * 2) : 0;
          return (
            <div key={clave} className="grid items-center gap-2" style={{ gridTemplateColumns: "72px 1fr 42px 16px" }}>
              <span className="text-[11px] text-gray-500 truncate">{label}</span>
              <div className="bg-gray-100 rounded h-1.5">
                <div className="h-1.5 rounded" style={{ width: `${ancho}%`, backgroundColor: colorBarra(comp, esClinico) }}></div>
              </div>
              <span className="text-[11px] text-gray-500 text-right">
                {comp.diferenciaPct != null ? `${comp.diferenciaPct > 0 ? "+" : ""}${comp.diferenciaPct}%` : "s/d"}
              </span>
              {tendenciaClave ? <IconoTendencia tendencia={depto.tendencias[tendenciaClave]} /> : <span />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Riesgo</p>
          {totalRiesgo > 0 ? (
            <div className="flex items-center gap-2">
              <div style={{ width: 56, height: 56 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={datosRiesgo} dataKey="valor" nameKey="nombre" innerRadius={16} outerRadius={26} paddingAngle={2}>
                      {datosRiesgo.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-gray-500 flex flex-col gap-0.5">
                <span>Sano {depto.distribucionRiesgo.sano}</span>
                <span>Moderado {depto.distribucionRiesgo.moderado}</span>
                <span>Alto {depto.distribucionRiesgo.alto}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-300">Sin datos</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Clasificación IMC</p>
          {totalImc > 0 ? (
            <>
              <div className="flex h-3 rounded overflow-hidden mb-1.5">
                <div style={{ width: `${(depto.distribucionImc.bajoPeso / totalImc) * 100}%`, backgroundColor: COLOR_IMC.bajoPeso }}></div>
                <div style={{ width: `${(depto.distribucionImc.normopeso / totalImc) * 100}%`, backgroundColor: COLOR_IMC.normopeso }}></div>
                <div style={{ width: `${(depto.distribucionImc.sobrepeso / totalImc) * 100}%`, backgroundColor: COLOR_IMC.sobrepeso }}></div>
                <div style={{ width: `${(depto.distribucionImc.obesidad / totalImc) * 100}%`, backgroundColor: COLOR_IMC.obesidad }}></div>
              </div>
              <div className="text-[10px] text-gray-500 flex flex-col gap-0.5">
                <span>Normopeso {depto.distribucionImc.normopeso}</span>
                <span>Sobrepeso {depto.distribucionImc.sobrepeso}</span>
                <span>Obesidad {depto.distribucionImc.obesidad}</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-300">Sin datos</p>
          )}
        </div>
      </div>

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Cobertura de datos</p>
      <div className="flex flex-col gap-1">
        {[
          { label: "IMC", pct: depto.coberturaDatos.imcPct },
          { label: "Presión", pct: depto.coberturaDatos.presionPct },
          { label: "Glucosa", pct: depto.coberturaDatos.glucosaPct },
          { label: "Colesterol", pct: depto.coberturaDatos.colesterolPct },
          { label: "Triglic.", pct: depto.coberturaDatos.trigliceridosPct },
        ].map((c) => (
          <div key={c.label} className="grid items-center gap-2" style={{ gridTemplateColumns: "60px 1fr 30px" }}>
            <span className="text-[10px] text-gray-400">{c.label}</span>
            <div className="bg-gray-100 rounded h-1">
              <div className="h-1 rounded" style={{ width: `${c.pct}%`, backgroundColor: c.pct >= 70 ? "#009BDE" : c.pct >= 40 ? "#eab308" : "#ef4444" }}></div>
            </div>
            <span className="text-[10px] text-gray-400 text-right">{c.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartamentoCard;
