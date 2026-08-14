import React from "react";
import { motion } from "framer-motion";

interface SectionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// `icon` acepta un nombre corto de Material Design Icons ("heart-pulse" ->
// "mdi mdi-heart-pulse") o, si ya trae espacio, una clase completa de otro set
// (p. ej. Font Awesome: "fa-solid fa-building") — mismo criterio que KpiCard.
// Contenedor estándar de cada bloque del dashboard (Demografía, Somatometría, etc.),
// mismo patrón visual (motion.div + card) usado en el resto del sistema.
const SectionCard: React.FC<SectionCardProps> = ({ icon, title, subtitle, actions, children }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xs overflow-hidden p-6"
  >
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-sm font-bold text-gray-800 flex items-center">
          <i className={`${icon.includes(" ") ? icon : `fa-solid fa-${icon}`} text-sea-blue mr-3`}></i>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1 ml-7">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </motion.div>
);

export default SectionCard;
