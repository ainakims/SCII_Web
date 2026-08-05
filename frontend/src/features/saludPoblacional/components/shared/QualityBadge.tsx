import React from "react";
import { Nivel, NIVEL_ESTILOS } from "../../clinicalRules";

interface QualityBadgeProps {
  label: string;
  nivel: Nivel;
}

const QualityBadge: React.FC<QualityBadgeProps> = ({ label, nivel }) => (
  <span className={`px-2 py-1 rounded-lg uppercase text-[9px] font-semibold ${NIVEL_ESTILOS[nivel]}`}>
    {label}
  </span>
);

export default QualityBadge;
