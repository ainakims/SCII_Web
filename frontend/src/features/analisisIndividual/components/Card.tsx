import React from "react";

interface CardProps {
  icon: string;
  iconColorClass?: string;
  title: string;
  badge?: React.ReactNode;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}

// Card local de este feature (no el SectionCard genérico de la app): título en
// mayúsculas pequeño + ícono coloreado por contexto + badge opcional a la
// derecha — replica el estilo del mockup de referencia que dio el usuario.
const Card: React.FC<CardProps> = ({ icon, iconColorClass = "text-sea-blue", title, badge, subtitle, className = "", children }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${className}`}>
    <div className="flex items-center justify-between gap-3 mb-1">
      <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
        <i className={`mdi ${icon} ${iconColorClass} text-sm`}></i>
        {title}
      </span>
      {badge}
    </div>
    {subtitle && <p className="text-[10px] text-gray-400 mb-2">{subtitle}</p>}
    <div className={subtitle ? "" : "mt-2.5"}>{children}</div>
  </div>
);

export default Card;
