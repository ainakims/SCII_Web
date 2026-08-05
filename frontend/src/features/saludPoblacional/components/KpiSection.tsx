import React, { useMemo } from "react";
import { RegistroValidado } from "../types";
import { calcularEdad, calcularEstadisticas, estadisticasIndicador, calcularCoberturaCalidad, IndicadorClave } from "../analytics";
import { clasificarRiesgo } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

interface KpiSectionProps {
  estadoActual: RegistroValidado[];
}

const INDICADORES_COBERTURA: { campo: IndicadorClave; label: string }[] = [
  { campo: "IMC", label: "IMC" },
  { campo: "Sistolica", label: "Sistólica" },
  { campo: "Diastolica", label: "Diastólica" },
  { campo: "Glucosa", label: "Glucosa" },
  { campo: "Colesterol", label: "Colesterol" },
  { campo: "Trigliceridos", label: "Triglicéridos" },
];

// KPIs y panel de calidad/cobertura de datos (secciones 18 y 22 del documento).
// Se calculan siempre sobre el ESTADO ACTUAL de la población filtrada (sección 4.1),
// nunca mezclado con el historial.
const KpiSection: React.FC<KpiSectionProps> = ({ estadoActual }) => {
  const edadStats = useMemo(() => {
    const edades = estadoActual
      .map((r) => calcularEdad(r.FechaNacimiento.original, r.Fecha.original))
      .filter((e): e is number => e != null);
    return calcularEstadisticas(edades);
  }, [estadoActual]);

  const imc = useMemo(() => estadisticasIndicador(estadoActual, "IMC"), [estadoActual]);
  const sistolica = useMemo(() => estadisticasIndicador(estadoActual, "Sistolica"), [estadoActual]);
  const diastolica = useMemo(() => estadisticasIndicador(estadoActual, "Diastolica"), [estadoActual]);
  const glucosa = useMemo(() => estadisticasIndicador(estadoActual, "Glucosa"), [estadoActual]);

  const distribucionRiesgo = useMemo(() => {
    const conteo = { Sano: 0, Moderado: 0, Alto: 0, "Sin clasificar": 0 };
    estadoActual.forEach((r) => {
      const { label } = clasificarRiesgo(r.Riesgo);
      if (label === "Sano") conteo.Sano++;
      else if (label === "Riesgo moderado") conteo.Moderado++;
      else if (label === "Riesgo alto") conteo.Alto++;
      else conteo["Sin clasificar"]++;
    });
    return conteo;
  }, [estadoActual]);

  const cobertura = useMemo(
    () => INDICADORES_COBERTURA.map(({ campo, label }) => ({ label, ...calcularCoberturaCalidad(estadoActual, campo) })),
    [estadoActual]
  );

  return (
    <SectionCard icon="view-dashboard-outline" title="Resumen de población" subtitle={`Población seleccionada: ${estadoActual.length.toLocaleString("es-MX")} personas`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="account-group" label="Personas" value={estadoActual.length.toLocaleString("es-MX")} />
        <KpiCard icon="calendar-account" label="Edad promedio" value={edadStats.media != null ? `${edadStats.media} años` : "Sin dato"} sub={edadStats.n ? `n=${edadStats.n}` : undefined} />
        <KpiCard icon="scale-bathroom" label="IMC promedio" value={imc.media ?? "Sin dato"} sub={imc.n ? `mediana ${imc.mediana} · n=${imc.n}` : undefined} />
        <KpiCard icon="heart-pulse" label="Presión promedio" value={sistolica.media && diastolica.media ? `${sistolica.media} / ${diastolica.media}` : "Sin dato"} sub={sistolica.n ? `n=${sistolica.n}` : undefined} />
        <KpiCard icon="water" label="Glucosa promedio" value={glucosa.media ?? "Sin dato"} sub={glucosa.n ? `mediana ${glucosa.mediana} · n=${glucosa.n}` : undefined} />
        <KpiCard icon="shield-check" label="Sanos" value={distribucionRiesgo.Sano.toLocaleString("es-MX")} />
        <KpiCard icon="shield-alert" label="Riesgo moderado" value={distribucionRiesgo.Moderado.toLocaleString("es-MX")} />
        <KpiCard icon="shield-off" label="Riesgo alto" value={distribucionRiesgo.Alto.toLocaleString("es-MX")} />
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-bold text-gray-600 mb-2 flex items-center">
          <i className="mdi mdi-clipboard-check-outline text-sea-blue mr-2"></i>
          Cobertura y calidad de datos
        </h3>
        <p className="text-[11px] text-gray-400 mb-3">
          Cobertura: registros con información disponible. Calidad: registros con valores válidos y coherentes. No son equivalentes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-100">
                <th className="py-2 font-semibold">Indicador</th>
                <th className="py-2 font-semibold text-right">Cobertura</th>
                <th className="py-2 font-semibold text-right">Calidad</th>
                <th className="py-2 font-semibold text-right">N evaluado</th>
              </tr>
            </thead>
            <tbody>
              {cobertura.map((c) => (
                <tr key={c.label} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700 font-medium">{c.label}</td>
                  <td className="py-2 text-right text-sea-blue font-semibold">{c.coberturaPct}%</td>
                  <td className="py-2 text-right text-gray-700 font-semibold">{c.calidadPct}%</td>
                  <td className="py-2 text-right text-gray-400">{c.totalEvaluado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
};

export default KpiSection;
