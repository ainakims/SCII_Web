import React, { useState } from "react";
import SectionCard from "./shared/SectionCard";

const TABS_IC = [
  { id: "indicadores",   label: "Indicadores",   icon: "fa-stethoscope",  titulo: "Indicadores" },
  { id: "consultas",     label: "Consultas",     icon: "fa-capsules",     titulo: "Consultas" },
  { id: "evaluaciones",  label: "Evaluaciones",  icon: "fa-clipboard-check", titulo: "Evaluaciones" },
] as const;
type VistaICTab = typeof TABS_IC[number]["id"];

// Mismo patrón de pestañas que AntropometriaCardiovascularMetabolicoSection.
const IndicadoresConsultasSection: React.FC = () => {
  const [vistaTab, setVistaTab] = useState<VistaICTab>("indicadores");
  const tabActual = TABS_IC.find((t) => t.id === vistaTab)!;

  return (
    <SectionCard
      icon={`fa-solid ${tabActual.icon}`}
      title={tabActual.titulo}
      actions={
        <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-md rounded-lg p-1">
          {TABS_IC.map((t) => (
            <button
              key={t.id}
              onClick={() => setVistaTab(t.id)}
              className={`w-32 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vistaTab === t.id ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
            >
              <i className={`fa-solid ${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className={vistaTab === "indicadores" ? "" : "hidden"}></div>
      <div className={vistaTab === "consultas" ? "" : "hidden"}></div>
      <div className={vistaTab === "evaluaciones" ? "" : "hidden"}></div>
    </SectionCard>
  );
};

export default IndicadoresConsultasSection;
