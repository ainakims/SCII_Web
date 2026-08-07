import React from "react";
import { HallazgoRelevante } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface HallazgosSectionProps {
  hallazgos: HallazgoRelevante[];
}

const HallazgosSection: React.FC<HallazgosSectionProps> = ({ hallazgos }) => (
  <SectionCard icon="clipboard-text-search-outline" title="Hallazgos relevantes">
    {hallazgos.length > 0 ? (
      <div className="flex flex-col gap-2.5">
        {hallazgos.map((h, i) => (
          <div key={i} className="bg-gray-50 rounded-lg border-l-4 border-l-sea-blue px-3.5 py-2.5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="text-xs font-bold text-gray-800">{h.Tema}</span>
              {h.IndicadoresRelacionados.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                  {h.IndicadoresRelacionados.map((ind, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-200 text-gray-600">{ind}</span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{h.Descripcion}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Sin hallazgos relevantes registrados.</p>
    )}
  </SectionCard>
);

export default HallazgosSection;
