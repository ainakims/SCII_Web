import React from "react";
import { RangoAnios } from "../rangoAnios";

interface SelectorRangoAniosProps {
  aniosDisponibles: number[];
  rango: RangoAnios;
  onChange: (rango: RangoAnios) => void;
}

// Selector compacto de rango de años (Desde/Hasta), en la misma línea que el
// título de cada gráfica de "Seguimiento Histórico" — permite comparar dos
// (o más) años en vez de ver solo el más reciente. Oculto si la gráfica no
// tiene más de un año de datos (nada que rangoear).
const selectCls = "text-[10px] font-semibold text-gray-600 bg-gray-50 rounded-md px-1.5 py-1 border-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-blue";

const SelectorRangoAnios: React.FC<SelectorRangoAniosProps> = ({ aniosDisponibles, rango, onChange }) => {
  if (aniosDisponibles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <select
        value={rango.desde}
        onChange={(e) => onChange({ desde: Number(e.target.value), hasta: Math.max(Number(e.target.value), rango.hasta) })}
        className={selectCls}
        title="Año desde"
      >
        {aniosDisponibles.filter((a) => a <= rango.hasta).map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <span className="text-[10px] text-gray-400 font-semibold">–</span>
      <select
        value={rango.hasta}
        onChange={(e) => onChange({ desde: Math.min(rango.desde, Number(e.target.value)), hasta: Number(e.target.value) })}
        className={selectCls}
        title="Año hasta"
      >
        {aniosDisponibles.filter((a) => a >= rango.desde).map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
};

export default SelectorRangoAnios;
