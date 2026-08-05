import React from "react";
import { motion } from "framer-motion";

interface SectionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Contenedor estándar de cada bloque del dashboard (Demografía, Antropometría, etc.),
// mismo patrón visual (motion.div + card) usado en el resto del sistema.
const SectionCard: React.FC<SectionCardProps> = ({ icon, title, subtitle, actions, children }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl overflow-hidden p-6"
  >
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-sm font-bold text-gray-800 flex items-center">
          <i className={`mdi mdi-${icon} text-sea-blue mr-3`}></i>
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
