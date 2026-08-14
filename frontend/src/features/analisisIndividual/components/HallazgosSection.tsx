import React from "react";
import { HallazgoRelevante } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface HallazgosSectionProps {
  hallazgos: HallazgoRelevante[];
}

// Mismo idioma visual que los recuadros de "resumen IA" al pie de
// Somatometría/Cardiovascular/Metabólico en Expediente (icono en cuadro
// suave + texto a la derecha, fondo plano sin borde) — no el borde
// izquierdo/rounded-lg de antes, que no aparece en ningún otro lado del sistema.
const HallazgosSection: React.FC<HallazgosSectionProps> = ({ hallazgos }) => (
  <SectionCard icon="magnifying-glass" title="Hallazgos Relevantes" subtitle="Detectados por el análisis de IA sobre el historial clínico">
    {hallazgos.length > 0 ? (
      <div className="flex flex-col gap-2.5">
        {hallazgos.map((h, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-100 rounded-lg px-3.5 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-blue/10 shrink-0">
              <i className="fa-solid fa-circle-exclamation text-sea-blue text-base"></i>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-gray-800 mb-1">{h.Tema}</span>
              <p className="text-xs text-gray-600 leading-relaxed">{h.Descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Sin hallazgos relevantes registrados.</p>
    )}
  </SectionCard>
);

export default HallazgosSection;
