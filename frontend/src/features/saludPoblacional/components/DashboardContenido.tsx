import React, { useMemo } from "react";
import { RegistroValidado } from "../types";
import { construirEstadoActual } from "../analytics";

import AntropometriaCardiovascularMetabolicoSection from "./AntropometriaCardiovascularMetabolicoSection";
import IndicadoresConsultasSection from "./IndicadoresConsultasSection";

interface DashboardContenidoProps {
  historico: RegistroValidado[];
  mensajeVacio: string;
}

// Bloque de secciones reutilizado por las distintas vistas del Dashboard
// (población completa o un departamento): siempre las mismas gráficas,
// alimentadas con el subconjunto de registros que corresponda. Los KPI cards
// no viven aquí: cada página los coloca donde le corresponda (ver KpiCards).
const DashboardContenido: React.FC<DashboardContenidoProps> = ({ historico, mensajeVacio }) => {
  const estadoActual = useMemo(() => construirEstadoActual(historico), [historico]);

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
        <i className="mdi mdi-database-off-outline text-3xl"></i>
        {mensajeVacio}
      </div>
    );
  }

  return (
    <>
      <AntropometriaCardiovascularMetabolicoSection estadoActual={estadoActual} historico={historico} />
      {/* Oculto temporalmente: card de Indicadores/Consultas/Evaluaciones */}
      {/* <IndicadoresConsultasSection /> */}
    </>
  );
};

export default DashboardContenido;
