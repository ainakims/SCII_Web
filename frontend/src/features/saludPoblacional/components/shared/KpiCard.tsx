import React from "react";

interface KpiCardProps {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

// `icon` acepta un nombre corto de Material Design Icons ("heart-pulse" ->
// "mdi mdi-heart-pulse") o, si ya trae espacio, una clase completa de otro set
// (p. ej. Font Awesome: "fa-solid fa-heart-pulse") — así cada sección elige el
// set de iconos sin tocar este componente compartido.
// Mismo patrón visual que las tarjetas de "Índice Corporal Inicial" en Indicadores.tsx.
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value }) => (
  <div className="relative bg-linear-to-b from-white to-gray-50 rounded-xl overflow-hidden flex items-center px-5 py-4 cursor-default group shadow-xl">
    <div className="relative z-1 size-12 rounded-md bg-linear-to-b from-sea-blue to-sky-blue to-90% flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-300">
      <i className={`${icon.includes(" ") ? icon : `fa-solid fa-${icon}`} text-white text-xl`}></i>
    </div>
    <div className="ml-4 flex-1 relative z-1 min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <h2 className="text-xl font-bold text-gray-800 leading-tight">{value}</h2>
      {/* {sub != null && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>} */}
    </div>
  </div>
);

export default KpiCard;
