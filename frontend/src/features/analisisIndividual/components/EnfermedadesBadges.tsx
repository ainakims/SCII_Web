import React from "react";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface EnfermedadesBadgesProps {
  enfermedades: string[];
}

const EnfermedadesBadges: React.FC<EnfermedadesBadgesProps> = ({ enfermedades }) => (
  <SectionCard icon="virus-outline" title="Enfermedades registradas">
    {enfermedades.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {enfermedades.map((e, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">{e}</span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Sin enfermedades registradas.</p>
    )}
  </SectionCard>
);

export default EnfermedadesBadges;
