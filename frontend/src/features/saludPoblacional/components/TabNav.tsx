import React from "react";

export interface TabDef {
  id: string;
  label: string;
  icon: string;
}

interface TabNavProps {
  tabs: TabDef[];
  activo: string;
  onChange: (id: string) => void;
}

// Navegación por pestañas del dashboard. Mismo lenguaje visual que el resto del
// sistema (gradiente sea-blue -> sky-blue para el elemento activo, igual que el
// menú lateral y los toggles de Indicadores.tsx).
const TabNav: React.FC<TabNavProps> = ({ tabs, activo, onChange }) => (
  <div className="bg-white/70 backdrop-blur-xl p-2 rounded-xl shadow-xl overflow-x-auto">
    <div className="flex items-center gap-1 min-w-max">
      {tabs.map((tab) => {
        const activa = tab.id === activo;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activa
                ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md shadow-blue-500/20"
                : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
            }`}
          >
            <i className={`mdi mdi-${tab.icon} text-base`}></i>
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default TabNav;
