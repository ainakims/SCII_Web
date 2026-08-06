import React, { useState } from "react";
import { RegistroValidado } from "../types";
import SectionCard from "./shared/SectionCard";
import { AntropometriaContenido } from "./AntropometriaSection";
import { CardiovascularContenido } from "./CardiovascularSection";
import { MetabolicoContenido } from "./MetabolicoSection";

interface AntropometriaCardiovascularMetabolicoSectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
}

const TABS_ACM = [
  { id: "antropometria", label: "Antropometría", icon: "fa-weight-scale", titulo: "Antropometría", subtitulo: "Peso, altura, cálculo de IMC — ICT" },
  { id: "cardiovascular", label: "Cardiovascular", icon: "fa-heart-pulse", titulo: "Cardiovascular", subtitulo: "Presión arterial: sistólica / diastólica" },
  { id: "metabolico", label: "Metabólico", icon: "fa-droplet", titulo: "Metabólico", subtitulo: "Glucosa, colesterol y triglicéridos" },
] as const;
type VistaACMTab = typeof TABS_ACM[number]["id"];

// Antropometría, Cardiovascular y Metabólico comparten un mismo bloque del
// expediente, alternando con pestañas (mismo patrón que la tabla de
// departamentos). Los tres se montan una sola vez y se alternan con `hidden`
// para no perder el estado interno de cada sección al cambiar de pestaña.
const AntropometriaCardiovascularMetabolicoSection: React.FC<AntropometriaCardiovascularMetabolicoSectionProps> = ({ estadoActual, historico }) => {
  const [vistaTab, setVistaTab] = useState<VistaACMTab>("antropometria");
  const tabActual = TABS_ACM.find((t) => t.id === vistaTab)!;

  return (
    <SectionCard
      icon={`fa-solid ${tabActual.icon}`}
      title={tabActual.titulo}
      subtitle={tabActual.subtitulo}
      actions={
        <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-md rounded-lg p-1">
          {TABS_ACM.map((t) => (
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
      <div className={vistaTab === "antropometria" ? "" : "hidden"}>
        <AntropometriaContenido estadoActual={estadoActual} historico={historico} />
      </div>
      <div className={vistaTab === "cardiovascular" ? "" : "hidden"}>
        <CardiovascularContenido estadoActual={estadoActual} />
      </div>
      <div className={vistaTab === "metabolico" ? "" : "hidden"}>
        <MetabolicoContenido estadoActual={estadoActual} />
      </div>
    </SectionCard>
  );
};

export default AntropometriaCardiovascularMetabolicoSection;
