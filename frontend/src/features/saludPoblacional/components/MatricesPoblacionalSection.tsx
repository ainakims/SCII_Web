import React, { useMemo, useState } from "react";
import { RegistroValidado, RegistroConsultaValidado } from "../types";
import { distribucionRiesgoPorDepartamento, construirConsultasPorDepartamento, aniosDisponiblesConsultas } from "../analytics";
import SectionCard from "./shared/SectionCard";
import RiesgoPorDepartamentoChart from "./RiesgoPorDepartamentoChart";
import ConsultasPorDepartamentoChart from "./ConsultasPorDepartamentoChart";

interface MatricesPoblacionalSectionProps {
  estadoActual: RegistroValidado[];
  consultas: RegistroConsultaValidado[];
}

// Riesgo por Departamento (estado actual, sin año) + Consultas por
// Departamento (histórico, navegable por año) — mismo patrón de "una
// SectionCard, dos gráficas a la mitad" que MatricesSection.tsx en
// AnalisisIndividual, pero exclusivo de la vista poblacional completa: no se
// monta en ExpedienteDepartamento.tsx (ExpedienteContenido, que sí es
// compartido), porque "por departamento" no tiene sentido ya filtrado a uno solo.
const MatricesPoblacionalSection: React.FC<MatricesPoblacionalSectionProps> = ({ estadoActual, consultas }) => {
  const riesgoPorDepto = useMemo(() => distribucionRiesgoPorDepartamento(estadoActual), [estadoActual]);

  const aniosDisponibles = useMemo(() => aniosDisponiblesConsultas(consultas), [consultas]);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const anioActivo = anioSeleccionado ?? aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear();

  const consultasPorDepto = useMemo(
    () => construirConsultasPorDepartamento(consultas, anioActivo),
    [consultas, anioActivo]
  );

  return (
    <SectionCard icon="diagram-next" title="Matrices de Seguimiento" subtitle="Riesgo y consultas por departamento">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiesgoPorDepartamentoChart datos={riesgoPorDepto} />
        <ConsultasPorDepartamentoChart
          datos={consultasPorDepto}
          anios={aniosDisponibles}
          anio={anioActivo}
          onCambiarAnio={setAnioSeleccionado}
        />
      </div>
    </SectionCard>
  );
};

export default MatricesPoblacionalSection;
