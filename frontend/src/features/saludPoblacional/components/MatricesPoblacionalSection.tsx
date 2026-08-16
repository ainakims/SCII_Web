import React, { useMemo, useState } from "react";
import { RegistroValidado, RegistroConsultaValidado } from "../types";
import {
  distribucionRiesgoPorDepartamento,
  construirConsultasPorDepartamento,
  aniosDisponiblesConsultas,
  construirVisitasPorAnio,
  construirVisitasAnualesConTendencia,
  construirVisitasPorDepartamento,
} from "../analytics";
import SectionCard from "./shared/SectionCard";
import RiesgoPorDepartamentoChart from "./RiesgoPorDepartamentoChart";
import ConsultasPorDepartamentoChart from "./ConsultasPorDepartamentoChart";
import VisitasAnualesChart from "./VisitasAnualesChart";
import VisitasPorDepartamentoChart from "./VisitasPorDepartamentoChart";

interface MatricesPoblacionalSectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
  consultas: RegistroConsultaValidado[];
}

// Riesgo por Departamento (estado actual, sin año) + Consultas por
// Departamento (histórico, navegable por año) — mismo patrón de "una
// SectionCard, dos gráficas a la mitad" que MatricesSection.tsx en
// AnalisisIndividual, pero exclusivo de la vista poblacional completa: no se
// monta en DashboardDepartamento.tsx (DashboardContenido, que sí es
// compartido), porque "por departamento" no tiene sentido ya filtrado a uno solo.
const MatricesPoblacionalSection: React.FC<MatricesPoblacionalSectionProps> = ({ estadoActual, historico, consultas }) => {
  const riesgoPorDepto = useMemo(() => distribucionRiesgoPorDepartamento(estadoActual), [estadoActual]);

  const aniosDisponibles = useMemo(() => aniosDisponiblesConsultas(consultas), [consultas]);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const anioActivo = anioSeleccionado ?? aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear();

  const consultasPorDepto = useMemo(
    () => construirConsultasPorDepartamento(consultas, anioActivo),
    [consultas, anioActivo]
  );

  // Asistencia anual: una barra por año, siempre todos los años disponibles
  // (sin selector de rango — se quitó el control de "últimos N años").
  const todosAnios = useMemo(() => construirVisitasAnualesConTendencia(construirVisitasPorAnio(historico)), [historico]);

  const [anioDetalleVisitas, setAnioDetalleVisitas] = useState<number | null>(null);
  const detalleVisitasPorDepto = useMemo(
    () => (anioDetalleVisitas != null ? construirVisitasPorDepartamento(historico, anioDetalleVisitas) : []),
    [historico, anioDetalleVisitas]
  );

  return (
    <SectionCard icon="diagram-next" title="Matrices de Seguimiento" subtitle="Riesgo, consultas y asistencia por departamento">
      {/* Riesgo por Departamento ocupa toda la fila (necesita ancho completo
          para que las etiquetas de departamento se lean bien). Las otras tres
          — Consultas, Asistencia anual y su detalle por departamento — van en
          una sola fila de 3 columnas: la tercera empieza vacía (nadie ha
          hecho clic en un periodo todavía) y muestra un placeholder que
          indica qué hacer, en vez de dejar un hueco sin explicación. */}
      <div className="flex flex-col gap-6">
        <RiesgoPorDepartamentoChart datos={riesgoPorDepto} />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <ConsultasPorDepartamentoChart
          datos={consultasPorDepto}
          anios={aniosDisponibles}
          anio={anioActivo}
          onCambiarAnio={setAnioSeleccionado}
        />
        <VisitasAnualesChart
          anios={todosAnios}
          onSeleccionarAnio={setAnioDetalleVisitas}
        />
        <VisitasPorDepartamentoChart
          detallePorDepto={detalleVisitasPorDepto}
          anioDetalle={anioDetalleVisitas}
        />
      </div>
    </SectionCard>
  );
};

export default MatricesPoblacionalSection;
