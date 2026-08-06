import React, { useMemo } from "react";
import { RegistroValidado } from "../types";
import { construirEstadoActual } from "../analytics";

import AntropometriaCardiovascularMetabolicoSection from "./AntropometriaCardiovascularMetabolicoSection";
import RiesgoMatrizSection from "./RiesgoMatrizSection";
import EvolucionHistoricaSection from "./EvolucionHistoricaSection";
import ResumenMedicoSection from "./ResumenMedicoSection";
import ResumenMedicoIASection from "./ResumenMedicoIASection";

interface ExpedienteContenidoProps {
  historico: RegistroValidado[];
  mensajeVacio: string;
}

// Bloque de secciones reutilizado por las distintas vistas del Expediente
// (población completa o un departamento): siempre las mismas gráficas,
// alimentadas con el subconjunto de registros que corresponda. Los KPI cards
// no viven aquí: cada página los coloca donde le corresponda (ver KpiCards).
const ExpedienteContenido: React.FC<ExpedienteContenidoProps> = ({ historico, mensajeVacio }) => {
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
      <RiesgoMatrizSection estadoActual={estadoActual} />
      <EvolucionHistoricaSection historico={historico} />
      <ResumenMedicoSection estadoActual={estadoActual} />
      <ResumenMedicoIASection estadoActual={estadoActual} historico={historico} />
    </>
  );
};

export default ExpedienteContenido;
