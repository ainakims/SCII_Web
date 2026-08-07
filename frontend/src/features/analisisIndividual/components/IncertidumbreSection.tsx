import React from "react";
import { EvolucionYRiesgosPotenciales } from "../types";

interface IncertidumbreSectionProps {
  evolucion: EvolucionYRiesgosPotenciales;
}

const IncertidumbreSection: React.FC<IncertidumbreSectionProps> = ({ evolucion }) => (
  <div className="rounded-xl shadow-md bg-gray-50 border border-dashed border-gray-300 p-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-2">
          <i className="mdi mdi-trending-up"></i>
          Si los hallazgos persisten
        </p>
        {evolucion.ImplicacionesSiPersiste.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1">
            {evolucion.ImplicacionesSiPersiste.map((im, i) => <li key={i} className="text-xs text-gray-600">{im}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">Sin implicaciones registradas.</p>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-2">
          <i className="mdi mdi-help-circle-outline"></i>
          Factores que aumentan la incertidumbre
        </p>
        {evolucion.FactoresQueAumentanIncertidumbre.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1">
            {evolucion.FactoresQueAumentanIncertidumbre.map((f, i) => <li key={i} className="text-xs text-gray-600">{f}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">Sin factores registrados.</p>
        )}
      </div>
    </div>
  </div>
);

export default IncertidumbreSection;
