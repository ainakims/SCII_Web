import React, { useMemo } from "react";
import { RegistroValidado } from "../types";
import { generarResumenMedico } from "../resumenMedico";
import SectionCard from "./shared/SectionCard";

interface ResumenMedicoSectionProps {
  estadoActual: RegistroValidado[];
}

const BLOQUES: { key: "recomendacionEjecutiva"; icon: string; titulo: string }[] = [
  { key: "recomendacionEjecutiva", icon: "lightbulb-on-outline", titulo: "Recomendación ejecutiva" },
];

// Sección 34 del documento: resumen médico generado automáticamente a partir de la
// cohorte filtrada activa (ver resumenMedico.ts). Es una síntesis basada en reglas,
// no en un modelo de IA; el analizador inteligente queda para una fase posterior.
const ResumenMedicoSection: React.FC<ResumenMedicoSectionProps> = ({ estadoActual }) => {
  const resumen = useMemo(() => generarResumenMedico(estadoActual), [estadoActual]);

  return (
    <SectionCard icon="file-document-outline" title="Resumen médico" subtitle="Síntesis generada a partir de la población filtrada activa">
      {!resumen ? (
        <div className="flex flex-col items-center justify-center text-center py-10 gap-2 text-gray-400">
          <i className="mdi mdi-database-off-outline text-2xl"></i>
          <p className="text-xs">No hay población suficiente para generar un resumen.</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-gray-400 mb-4">
            Basado en {resumen.poblacion.toLocaleString("es-MX")} personas (estado actual de la población filtrada). Síntesis generada por reglas, no reemplaza el criterio clínico.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {BLOQUES.map((b) => (
              <div key={b.key} className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center mb-2">
                  <i className={`mdi mdi-${b.icon} text-sea-blue mr-2`}></i>
                  {b.titulo}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">{(resumen as any)[b.key]}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-start gap-2 bg-blue-50 text-sea-blue text-[11px] px-3 py-2 rounded-lg mt-4">
        <i className="mdi mdi-robot-outline mt-0.5"></i>
        <span>Este resumen se genera con reglas deterministas sobre los datos ya validados. Un analizador inteligente (IA) para enriquecer este resumen queda reservado para una fase posterior del proyecto.</span>
      </div>
    </SectionCard>
  );
};

export default ResumenMedicoSection;
