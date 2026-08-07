import React, { useMemo } from "react";
import { HistoricosYGraficas } from "../types";
import { clasificarPresion, clasificarFrecuenciaCardiaca, clasificarImc, EstiloBadge } from "../clasificacionVitales";

interface MetricasDestacadasProps {
  historicos: HistoricosYGraficas;
}

function ultimoValido<T>(valores: T[], etiquetas: string[]): { valor: T; etiqueta: string } | null {
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) return { valor: valores[i], etiqueta: etiquetas[i] ?? "" };
  }
  return null;
}

const MetricaBox: React.FC<{ icono: string; label: string; fecha?: string; valor: string; unidad?: string; badge: EstiloBadge }> = ({ icono, label, fecha, valor, unidad, badge }) => (
  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <i className={`mdi ${icono} text-sea-blue`}></i>
        {label}
      </span>
      {fecha && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{fecha}</span>}
    </div>
    <div className="text-lg font-extrabold text-gray-800 leading-tight">
      {valor} {unidad && <span className="text-xs font-normal text-gray-400">{unidad}</span>}
    </div>
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.clase}`}>{badge.label.toUpperCase()}</span>
  </div>
);

// "Métricas destacadas": último valor disponible de cada signo vital, calculado
// a partir de los mismos arreglos de HistoricosYGraficas (no es un campo aparte
// del contrato — se deriva aquí para no depender de que el servicio lo repita).
const MetricasDestacadas: React.FC<MetricasDestacadasProps> = ({ historicos }) => {
  const presion = useMemo(
    () => ultimoValido(historicos.PresionArterial.Sistolica, historicos.PresionArterial.Fechas),
    [historicos]
  );
  const diastolica = useMemo(
    () => ultimoValido(historicos.PresionArterial.Diastolica, historicos.PresionArterial.Fechas),
    [historicos]
  );
  const fc = useMemo(
    () => ultimoValido(historicos.PresionArterial.FrecuenciaCardiaca, historicos.PresionArterial.Fechas),
    [historicos]
  );
  const imc = useMemo(
    () => ultimoValido(historicos.EvolucionIMC.ValoresIMC, historicos.Meses),
    [historicos]
  );
  const peso = useMemo(
    () => ultimoValido(historicos.EvolucionPesoAnual.PesoReal, historicos.EvolucionPesoAnual.Fechas),
    [historicos]
  );

  const badgePresion = clasificarPresion(presion?.valor ?? null, diastolica?.valor ?? null);
  const badgeFc = clasificarFrecuenciaCardiaca(fc?.valor ?? null);
  const badgeImc = clasificarImc(imc?.valor ?? null);

  return (
    <div className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Últimos signos vitales</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricaBox
          icono="mdi-heart-pulse"
          label="Presión arterial"
          fecha={presion?.etiqueta}
          valor={presion && diastolica ? `${presion.valor}/${diastolica.valor}` : "s/d"}
          unidad="mmHg"
          badge={badgePresion}
        />
        <MetricaBox
          icono="mdi-scale-bathroom"
          label="IMC / Peso"
          fecha={imc?.etiqueta}
          valor={imc ? `${imc.valor}` : "s/d"}
          unidad={peso ? `kg/m² · ${peso.valor} kg` : "kg/m²"}
          badge={badgeImc}
        />
        <MetricaBox
          icono="mdi-pulse"
          label="Frecuencia cardiaca"
          fecha={fc?.etiqueta}
          valor={fc ? `${fc.valor}` : "s/d"}
          unidad="bpm"
          badge={badgeFc}
        />
        <MetricaBox
          icono="mdi-weight-kilogram"
          label="Peso actual"
          fecha={peso?.etiqueta}
          valor={peso ? `${peso.valor}` : "s/d"}
          unidad="kg"
          badge={{ label: "Registrado", clase: "bg-sky-blue/10 text-sky-blue border border-sky-blue/20" }}
        />
      </div>
    </div>
  );
};

export default MetricasDestacadas;
