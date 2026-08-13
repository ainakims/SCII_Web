import React, { useMemo, useState } from "react";
import { RegistroValidado, RegistroConsultaValidado } from "../types";
import {
  distribucionRiesgoPorDepartamento,
  construirConsultasPorDepartamento,
  aniosDisponiblesConsultas,
  construirVisitasPorAnio,
  construirParesAnuales,
  construirVisitasPorDepartamento,
} from "../analytics";
import SectionCard from "./shared/SectionCard";
import RiesgoPorDepartamentoChart from "./RiesgoPorDepartamentoChart";
import ConsultasPorDepartamentoChart from "./ConsultasPorDepartamentoChart";
import VisitasAnualesChart from "./VisitasAnualesChart";

interface MatricesPoblacionalSectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
  consultas: RegistroConsultaValidado[];
}

const PARES_INICIALES = 2;

// Riesgo por Departamento (estado actual, sin año) + Consultas por
// Departamento (histórico, navegable por año) — mismo patrón de "una
// SectionCard, dos gráficas a la mitad" que MatricesSection.tsx en
// AnalisisIndividual, pero exclusivo de la vista poblacional completa: no se
// monta en ExpedienteDepartamento.tsx (ExpedienteContenido, que sí es
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

  // Asistencia anual: todos los pares año/año-anterior se calculan una sola
  // vez; el control de rango solo recorta cuántos se muestran (últimos N).
  const todosPares = useMemo(() => construirParesAnuales(construirVisitasPorAnio(historico)), [historico]);
  const [cantidadPares, setCantidadPares] = useState(PARES_INICIALES);
  const paresVisibles = useMemo(
    () => todosPares.slice(-Math.min(cantidadPares, todosPares.length)),
    [todosPares, cantidadPares]
  );

  const [anioDetalleVisitas, setAnioDetalleVisitas] = useState<number | null>(null);
  const detalleVisitasPorDepto = useMemo(
    () => (anioDetalleVisitas != null ? construirVisitasPorDepartamento(historico, anioDetalleVisitas) : []),
    [historico, anioDetalleVisitas]
  );

  return (
    <SectionCard icon="diagram-next" title="Matrices de Seguimiento" subtitle="Riesgo, consultas y asistencia por departamento">
      {/* Cada gráfica ocupa toda la fila: todas necesitan ancho completo para
          que las etiquetas (departamentos, periodos) se lean bien. */}
      <div className="flex flex-col gap-6">
        <RiesgoPorDepartamentoChart datos={riesgoPorDepto} />
        <ConsultasPorDepartamentoChart
          datos={consultasPorDepto}
          anios={aniosDisponibles}
          anio={anioActivo}
          onCambiarAnio={setAnioSeleccionado}
        />
        <VisitasAnualesChart
          pares={paresVisibles}
          cantidadPares={cantidadPares}
          cantidadMaxima={todosPares.length}
          onCambiarCantidad={setCantidadPares}
          detallePorDepto={detalleVisitasPorDepto}
          anioDetalle={anioDetalleVisitas}
          onSeleccionarPar={setAnioDetalleVisitas}
        />
      </div>
    </SectionCard>
  );
};

export default MatricesPoblacionalSection;
