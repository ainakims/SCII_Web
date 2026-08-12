import React from "react";
import { HeatmapAsistenciaAnio, MatrizProtocoloItem } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";
import HeatmapAsistencia from "./HeatmapAsistencia";
import MatrizProtocolosChart from "./MatrizProtocolosChart";

interface MatricesSectionProps {
  heatmap: HeatmapAsistenciaAnio[];
  protocolos: MatrizProtocoloItem[];
}

// Agrupa las matrices de riesgo mensual y de consultas históricas en una sola
// card (mitad cada una), mismo patrón que UltimaTomaSection.
const MatricesSection: React.FC<MatricesSectionProps> = ({ heatmap, protocolos }) => (
  <SectionCard icon="diagram-next" title="Matrices de Seguimiento" subtitle="Riesgo mensual por indicadores y consultas por protocolo">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <HeatmapAsistencia anios={heatmap} />
      <MatrizProtocolosChart protocolos={protocolos} />
    </div>
  </SectionCard>
);

export default MatricesSection;
