import React from "react";
import { PrioridadYUrgencia, AptitudLaboral, Prioridad } from "../types";

interface HeaderAnalisisProps {
  prioridad: PrioridadYUrgencia;
  aptitud: AptitudLaboral;
}

const ACENTO_PRIORIDAD: Record<Prioridad, { borde: string; badge: string }> = {
  Baja: { borde: "border-l-green-500", badge: "bg-green-50 text-green-700 border border-green-200" },
  Media: { borde: "border-l-amber-500", badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  Alta: { borde: "border-l-red-500", badge: "bg-red-50 text-red-600 border border-red-200" },
  Critica: { borde: "border-l-red-700", badge: "bg-red-100 text-red-800 border border-red-300" },
};

const HeaderAnalisis: React.FC<HeaderAnalisisProps> = ({ prioridad, aptitud }) => {
  const acento = ACENTO_PRIORIDAD[prioridad.Prioridad];

  return (
    <div className="flex flex-col gap-4">
      {/* Aptitud laboral: card completa con borde y fondo teñido según dictamen */}
      <div
      className={` bg-gradient-to-b ${aptitud.Apto ? "from-aqua-green/30 to-white" : "from-red-50 to-white"} rounded-xl shadow-xl px-4 py-3 gap-3`}
      // className={`rounded-xl p-4 border ${aptitud.Apto ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[12px] font-bold uppercase tracking-wide flex items-center gap-2 ${aptitud.Apto ? "text-white" : "text-red-700"}`}>
            <i className="mdi mdi-account-check-outline text-sm"></i>
            Dictamen de aptitud laboral
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${aptitud.Apto ? "bg-white text-green-700 border-green-300" : "bg-white text-red-700 border-red-300"}`}>
            <i className={`mdi ${aptitud.Apto ? "mdi-check" : "mdi-close"} mr-1`}></i>
            {aptitud.Apto ? "APTO" : "NO APTO"}
          </span>
        </div>
        <p className={`text-[13px] leading-relaxed mb-2.5 ${aptitud.Apto ? "text-green-900" : "text-red-900"}`}><span className="font-bold">Puesto: </span>{aptitud.Justificacion}</p>
        {aptitud.FactoresDeRiesgoDetectados.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {aptitud.FactoresDeRiesgoDetectados.map((f, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">{f}</span>
            ))}
          </div>
        )}
        <div className={`bg-white rounded-lg border px-3 py-2 ${aptitud.Apto ? "border-green-200" : "border-red-200"}`}>
          <p className="text-[12px] text-gray-700 leading-relaxed"><span className="font-bold">Recomendación: </span>{aptitud.Recomendacion}</p>
        </div>
      </div>

      {/* Prioridad y urgencia: acento izquierdo según nivel */}
      <div className={`rounded-xl shadow-sm p-4 bg-white border-l-4 ${acento.borde}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <i className="mdi mdi-alert-outline text-amber-500 text-sm"></i>
            Nivel de prioridad médica
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${acento.badge}`}>
            PRIORIDAD {prioridad.Prioridad.toUpperCase()}
          </span>
        </div>
        {prioridad.Urgente && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg mb-2">
            <i className="mdi mdi-alert-octagon-outline"></i>
            Requiere atención urgente
          </div>
        )}
        <p className="text-[13px] text-gray-600 leading-relaxed mb-2.5">{prioridad.Justificacion}</p>
        <div className="bg-amber-50 rounded-lg border border-amber-200 px-3 py-2">
          <p className="text-[12px] text-amber-800 leading-relaxed"><i className="mdi mdi-calendar-check mr-1"></i><span className="font-bold">Plan sugerido: </span>{prioridad.Recomendacion}</p>
        </div>
      </div>
    </div>
  );
};

export default HeaderAnalisis;
