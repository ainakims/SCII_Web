import React from "react";
import { PresionArterial, EvolucionIMC, EvolucionPesoAnual, PerfilMetabolico } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";
import EvolucionPesoChart from "./EvolucionPesoChart";
import PresionArterialChart from "./PresionArterialChart";
import EvolucionImcChart from "./EvolucionImcChart";
import PerfilMetabolicoChart from "./PerfilMetabolicoChart";

interface UltimaTomaSectionProps {
  meses: string[];
  peso: EvolucionPesoAnual;
  presion: PresionArterial;
  imc: EvolucionIMC;
  perfilMetabolico: PerfilMetabolico;
}

// Agrupa las 4 gráficas de la toma más reciente en una sola card (2 por
// línea), igual que Somatometría/Cardiovascular/Metabólico en Expediente
// (AntropometriaCardiovascularMetabolicoSection.tsx), pero sin pestañas: las
// 4 siempre están visibles a la vez, no se alternan.
const UltimaTomaSection: React.FC<UltimaTomaSectionProps> = ({ meses, peso, presion, imc, perfilMetabolico }) => (
  <SectionCard icon="chart-simple" title="Seguimiento Histórico" subtitle="Peso, presión arterial, IMC y perfil metabólico">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <EvolucionPesoChart datos={peso} />
      <PresionArterialChart datos={presion} />
      <EvolucionImcChart meses={meses} evolucion={imc} />
      <PerfilMetabolicoChart meses={meses} perfil={perfilMetabolico} />
    </div>
  </SectionCard>
);

export default UltimaTomaSection;
