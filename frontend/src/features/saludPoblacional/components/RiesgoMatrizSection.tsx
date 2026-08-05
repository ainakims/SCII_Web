import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RegistroValidado } from "../types";
import { construirMatrizRiesgo, pivotConteo, calcularEdad, IndicadorClave } from "../analytics";
import { clasificarIMC, clasificarICT, clasificarGlucosa, clasificarColesterol, clasificarTrigliceridos, clasificarRiesgo, clasificarSistolica, clasificarGrupoEtario, GRUPOS_ETARIOS, Clasificacion } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";

interface RiesgoMatrizSectionProps {
  estadoActual: RegistroValidado[];
}

const OPCIONES: { campo: IndicadorClave; label: string; clasificador: (v: number | null) => Clasificacion }[] = [
  { campo: "IMC", label: "IMC", clasificador: clasificarIMC },
  { campo: "Sistolica", label: "Presión sistólica", clasificador: clasificarSistolica },
  { campo: "ICT", label: "Perímetro abdominal (ICT)", clasificador: clasificarICT },
  { campo: "Glucosa", label: "Glucosa", clasificador: clasificarGlucosa },
  { campo: "Colesterol", label: "Colesterol", clasificador: clasificarColesterol },
  { campo: "Trigliceridos", label: "Triglicéridos", clasificador: clasificarTrigliceridos },
];

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

const NIVELES_RIESGO = ["Sano", "Riesgo moderado", "Riesgo alto", "Sin clasificar"] as const;

// Color de celda del mapa de calor según el % en riesgo elevado (moderado + alto).
function colorCelda(pct: number): string {
  if (pct >= 50) return "bg-red-100 text-red-700";
  if (pct >= 30) return "bg-yellow-100 text-yellow-700";
  if (pct > 0) return "bg-aqua-green/10 text-green-800";
  return "bg-gray-50 text-gray-400";
}

// Sección 28 del documento: mapa de calor Grupo Etario × Nivel de Riesgo (campo
// Riesgo tal como lo designa el sistema: Sano / Moderado / Alto), más un explorador
// genérico Grupo Etario × cualquier otro indicador clínico.
const RiesgoMatrizSection: React.FC<RiesgoMatrizSectionProps> = ({ estadoActual }) => {
  const [campoSeleccionado, setCampoSeleccionado] = useState<IndicadorClave>("IMC");
  const opcion = OPCIONES.find((o) => o.campo === campoSeleccionado)!;

  const ordenGrupos = [...GRUPOS_ETARIOS.map((g) => g.label), "No clasificado"];

  const matrizRiesgo = useMemo(() => {
    const pivot = pivotConteo(
      estadoActual,
      (r) => clasificarGrupoEtario(calcularEdad(r.FechaNacimiento.original, r.Fecha.original)),
      (r) => clasificarRiesgo(r.Riesgo).label
    );
    const porFila = new Map(pivot.map((row) => [row.fila, row]));

    return ordenGrupos
      .map((grupo) => {
        const fila = porFila.get(grupo) ?? {};
        const sano = fila["Sano"] ?? 0;
        const moderado = fila["Riesgo moderado"] ?? 0;
        const alto = fila["Riesgo alto"] ?? 0;
        const sinClasificar = fila["Sin clasificar"] ?? 0;
        const total = sano + moderado + alto + sinClasificar;
        const elevado = moderado + alto;
        return {
          grupo,
          sano,
          moderado,
          alto,
          sinClasificar,
          total,
          elevadoPct: total ? Number(((elevado / total) * 100).toFixed(1)) : 0,
        };
      })
      .filter((f) => f.total > 0);
  }, [estadoActual]);

  const filasIndicador = useMemo(
    () => construirMatrizRiesgo(estadoActual, opcion.campo, opcion.clasificador),
    [estadoActual, opcion]
  );

  return (
    <SectionCard icon="grid" title="Matriz de riesgo poblacional" subtitle="Grupo etario × nivel de riesgo designado">
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-xs border-separate border-spacing-1">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="py-2 font-semibold">Grupo etario</th>
              {NIVELES_RIESGO.map((n) => <th key={n} className="py-2 font-semibold text-center">{n}</th>)}
              <th className="py-2 font-semibold text-center">Total</th>
              <th className="py-2 font-semibold text-center">Riesgo elevado</th>
            </tr>
          </thead>
          <tbody>
            {matrizRiesgo.map((f) => (
              <tr key={f.grupo}>
                <td className="py-2 px-2 text-gray-700 font-medium">{f.grupo}</td>
                <td className="text-center rounded-md bg-aqua-green/10 text-green-800 py-2">{f.sano}</td>
                <td className="text-center rounded-md bg-sunray-yellow/10 text-yellow-700 py-2">{f.moderado}</td>
                <td className="text-center rounded-md bg-red-100 text-red-700 py-2">{f.alto}</td>
                <td className="text-center rounded-md bg-gray-50 text-gray-500 py-2">{f.sinClasificar}</td>
                <td className="text-center text-gray-400 py-2">{f.total}</td>
                <td className={`text-center rounded-md font-bold py-2 ${colorCelda(f.elevadoPct)}`}>{f.elevadoPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {matrizRiesgo.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Sin datos suficientes de riesgo para la población seleccionada.</p>
        )}
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-xs font-bold text-gray-600 mb-3 flex items-center">
          <i className="mdi mdi-magnify-scan text-sea-blue mr-2"></i>
          Explorar por otro indicador
        </h3>
        <div className="w-56 mb-4 relative">
          <select className={selectCls} value={campoSeleccionado} onChange={(e) => setCampoSeleccionado(e.target.value as IndicadorClave)}>
            {OPCIONES.map((o) => <option key={o.campo} value={o.campo}>{o.label}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="py-2 font-semibold">Grupo etario</th>
                  <th className="py-2 font-semibold text-right">Elevado</th>
                  <th className="py-2 font-semibold text-right">N válidos</th>
                </tr>
              </thead>
              <tbody>
                {filasIndicador.map((f) => (
                  <tr key={f.grupoEtario} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-700 font-medium">{f.grupoEtario}</td>
                    <td className="py-2 text-right text-red-500 font-semibold">{f.n > 0 ? `${f.elevadoPct}%` : "—"}</td>
                    <td className="py-2 text-right text-gray-400">{f.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filasIndicador} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="grupoEtario" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(value: any, _name, item: any) => [`${value}% (n=${item?.payload?.n ?? 0})`, "Elevado"]} />
              <Bar dataKey="elevadoPct" name="Elevado" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
};

export default RiesgoMatrizSection;
