import React from "react";
import { motion } from "framer-motion";
import { PresionArterial, EvolucionIMC, EvolucionPesoAnual, PerfilMetabolico } from "../types";
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

// Mismo shell que cada card individual de SectionCard.tsx (bg degradado,
// rounded-xl, shadow-xl, entrada con motion), para que cada gráfica se vea
// consistente con el resto del dashboard aunque ya no compartan una sola card.
const CardGrafica: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xs overflow-hidden"
  >
    {children}
  </motion.div>
);

// Las 4 gráficas de la toma más reciente, cada una en su propia card (2 por
// línea) — antes vivían agrupadas dentro de una sola SectionCard
// "Seguimiento Histórico", que ya no existe. La leyenda del rango de fechas
// va dentro de cada card, debajo de su propia leyenda de series (ver
// EvolucionPesoChart.tsx / PresionArterialChart.tsx / etc.), no agrupada.
const UltimaTomaSection: React.FC<UltimaTomaSectionProps> = ({ meses, peso, presion, imc, perfilMetabolico }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <CardGrafica><EvolucionPesoChart datos={peso} /></CardGrafica>
    <CardGrafica><EvolucionImcChart meses={meses} evolucion={imc} /></CardGrafica>
    <CardGrafica><PresionArterialChart datos={presion} /></CardGrafica>
    <CardGrafica><PerfilMetabolicoChart meses={meses} perfil={perfilMetabolico} /></CardGrafica>
  </div>
);

export default UltimaTomaSection;
