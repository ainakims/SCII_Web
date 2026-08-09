import React from "react";
import { EvolucionYRiesgosPotenciales } from "../types";
import Card from "./Card";

interface IncertidumbreSectionProps {
  evolucion: EvolucionYRiesgosPotenciales;
}

const IncertidumbreSection: React.FC<IncertidumbreSectionProps> = ({ evolucion }) => (
  <Card icon="mdi-help-circle-outline" iconColorClass="text-gray-400" title="Factores de incertidumbre registrados" className="border-dashed border-gray-300 bg-gray-50">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Si los hallazgos persisten</p>
        {evolucion.ImplicacionesSiPersiste.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1">
            {evolucion.ImplicacionesSiPersiste.map((im, i) => <li key={i} className="text-xs text-gray-600">{im}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">Sin implicaciones registradas.</p>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Aumentan la incertidumbre</p>
        {evolucion.FactoresQueAumentanIncertidumbre.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1">
            {evolucion.FactoresQueAumentanIncertidumbre.map((f, i) => <li key={i} className="text-xs text-gray-600">{f}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">Sin factores registrados.</p>
        )}
      </div>
    </div>
  </Card>
);

export default IncertidumbreSection;
