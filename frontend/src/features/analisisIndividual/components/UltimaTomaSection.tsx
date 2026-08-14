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
// className opcional: permite que la card ocupe las 2 columnas (lg:col-span-2)
// cuando su compañera de fila no trae datos y se oculta.
const CardGrafica: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xs overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

// Las 4 gráficas de la toma más reciente, cada una en su propia card (2 por
// línea) — antes vivían agrupadas dentro de una sola SectionCard
// "Seguimiento Histórico", que ya no existe. La leyenda del rango de fechas
// va dentro de cada card, debajo de su propia leyenda de series (ver
// EvolucionPesoChart.tsx / PresionArterialChart.tsx / etc.), no agrupada.
//
// Cada gráfica solo se muestra si el resultado trae datos para ella (evita
// cards vacías con el mensaje "Sin datos..."); las dos gráficas de cada fila
// (peso+IMC, presión+perfil metabólico) se ocultan/expanden entre sí: si una
// de la pareja no trae datos, la otra ocupa el ancho completo (lg:col-span-2).
const hayValores = (...series: (number | null)[][]): boolean =>
  series.some((serie) => serie.some((v) => v != null));

const UltimaTomaSection: React.FC<UltimaTomaSectionProps> = ({ meses, peso, presion, imc, perfilMetabolico }) => {
  const hayPeso = hayValores(peso.PesoReal, peso.PesoIdeal);
  const hayImc = hayValores(imc.ValoresIMC);
  const hayPresion = hayValores(presion.Sistolica, presion.Diastolica);
  const hayPerfil = hayValores(perfilMetabolico.Glucosa, perfilMetabolico.Colesterol, perfilMetabolico.Trigliceridos);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {hayPeso && (
        <CardGrafica className={!hayImc ? "lg:col-span-2" : undefined}>
          <EvolucionPesoChart datos={peso} />
        </CardGrafica>
      )}
      {hayImc && (
        <CardGrafica className={!hayPeso ? "lg:col-span-2" : undefined}>
          <EvolucionImcChart meses={meses} evolucion={imc} />
        </CardGrafica>
      )}
      {hayPresion && (
        <CardGrafica className={!hayPerfil ? "lg:col-span-2" : undefined}>
          <PresionArterialChart datos={presion} />
        </CardGrafica>
      )}
      {hayPerfil && (
        <CardGrafica className={!hayPresion ? "lg:col-span-2" : undefined}>
          <PerfilMetabolicoChart meses={meses} perfil={perfilMetabolico} />
        </CardGrafica>
      )}
    </div>
  );
};

export default UltimaTomaSection;
