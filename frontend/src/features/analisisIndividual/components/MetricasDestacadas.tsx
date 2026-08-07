import React, { useMemo } from "react";
import { HistoricosYGraficas } from "../types";
import { clasificarPresion, clasificarFrecuenciaCardiaca, clasificarImc, EstiloBadge } from "../clasificacionVitales";

interface MetricasDestacadasProps {
  historicos: HistoricosYGraficas;
}

function ultimoValido<T>(valores: T[], etiquetas: string[]): { valor: T; etiqueta: string; indice: number } | null {
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) return { valor: valores[i], etiqueta: etiquetas[i] ?? "", indice: i };
  }
  return null;
}

const MetricaBox: React.FC<{ icono: string; label: string; fecha?: string; valor: string; unidad?: string; badge: EstiloBadge }> = ({ icono, label, fecha, valor, unidad, badge }) => (
  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
        <i className={`mdi ${icono} text-gray-400`}></i>
        {label}
      </span>
      {fecha && <span className="text-[10px] text-gray-400 bg-gray-200/70 px-1.5 py-0.5 rounded">{fecha}</span>}
    </div>
    <div className="text-lg font-extrabold text-gray-800 leading-tight">
      {valor} {unidad && <span className="text-[11px] font-normal text-gray-400">{unidad}</span>}
    </div>
    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.clase}`}>{badge.label.toUpperCase()}</span>
  </div>
);

// "Últimos signos vitales / métricas": último valor disponible de cada serie,
// derivado de HistoricosYGraficas (no es un campo aparte del contrato).
const MetricasDestacadas: React.FC<MetricasDestacadasProps> = ({ historicos }) => {
  const sistolica = useMemo(() => ultimoValido(historicos.PresionArterial.Sistolica, historicos.PresionArterial.Fechas), [historicos]);
  const diastolica = useMemo(() => ultimoValido(historicos.PresionArterial.Diastolica, historicos.PresionArterial.Fechas), [historicos]);
  const fc = useMemo(() => ultimoValido(historicos.PresionArterial.FrecuenciaCardiaca, historicos.PresionArterial.Fechas), [historicos]);
  const imc = useMemo(() => ultimoValido(historicos.EvolucionIMC.ValoresIMC, historicos.Meses), [historicos]);
  const peso = useMemo(() => ultimoValido(historicos.EvolucionPesoAnual.PesoReal, historicos.EvolucionPesoAnual.Fechas), [historicos]);
  const pesoIdeal = useMemo(() => ultimoValido(historicos.EvolucionPesoAnual.PesoIdeal, historicos.EvolucionPesoAnual.Fechas), [historicos]);

  // IMC previo: el último valor válido ANTES del actual, para mostrarlo en el badge.
  const imcPrevio = useMemo(() => {
    if (!imc) return null;
    return ultimoValido(historicos.EvolucionIMC.ValoresIMC.slice(0, imc.indice), historicos.Meses.slice(0, imc.indice));
  }, [historicos, imc]);

  const badgePresion = clasificarPresion(sistolica?.valor ?? null, diastolica?.valor ?? null);
  const badgeFc = clasificarFrecuenciaCardiaca(fc?.valor ?? null);
  const badgeImc = clasificarImc(imc?.valor ?? null);
  const badgeImcConPrevio: EstiloBadge = imcPrevio ? { ...badgeImc, label: `${badgeImc.label} (prev: ${imcPrevio.valor})` } : badgeImc;

  const diferenciaPeso = peso && pesoIdeal ? Number((peso.valor - pesoIdeal.valor).toFixed(1)) : null;
  const badgePeso: EstiloBadge = diferenciaPeso == null
    ? { label: "Sin dato", clase: "bg-gray-50 text-gray-400 border border-gray-200" }
    : Math.abs(diferenciaPeso) <= 2
    ? { label: "En meta", clase: "bg-green-50 text-green-700 border border-green-200" }
    : diferenciaPeso > 0
    ? { label: `+${diferenciaPeso} kg de la meta`, clase: "bg-amber-50 text-amber-700 border border-amber-200" }
    : { label: `${diferenciaPeso} kg de la meta`, clase: "bg-sky-blue/10 text-sky-blue border border-sky-blue/20" };

  const ultimaFecha = sistolica?.etiqueta || imc?.etiqueta || peso?.etiqueta;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">Últimos signos vitales / métricas</span>
        {ultimaFecha && <span className="text-[10px] text-gray-400">Último registro: {ultimaFecha}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricaBox icono="mdi-heart-pulse" label="Presión arterial" fecha={sistolica?.etiqueta} valor={sistolica && diastolica ? `${sistolica.valor}/${diastolica.valor}` : "s/d"} unidad="mmHg" badge={badgePresion} />
        <MetricaBox icono="mdi-scale-bathroom" label="IMC" fecha={imc?.etiqueta} valor={imc ? `${imc.valor}` : "s/d"} unidad="kg/m²" badge={badgeImcConPrevio} />
        <MetricaBox icono="mdi-pulse" label="Frecuencia cardiaca" fecha={fc?.etiqueta} valor={fc ? `${fc.valor}` : "s/d"} unidad="bpm" badge={badgeFc} />
        <MetricaBox icono="mdi-weight-kilogram" label="Peso vs. meta" fecha={peso?.etiqueta} valor={peso ? `${peso.valor}` : "s/d"} unidad={pesoIdeal ? `kg (meta ${pesoIdeal.valor})` : "kg"} badge={badgePeso} />
      </div>
    </div>
  );
};

export default MetricasDestacadas;
