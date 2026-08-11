import React, { useMemo } from "react";
import { MatrizProtocoloItem } from "../types";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";

interface MatrizProtocolosChartProps {
  meses: string[];
  protocolos: MatrizProtocoloItem[];
}

// Tabla histórica de consultas por protocolo y mes, con totales por fila y por
// columna — más legible que una gráfica para conteos pequeños por celda.
const MatrizProtocolosChart: React.FC<MatrizProtocolosChartProps> = ({ meses, protocolos }) => {
  const { totalesMensuales, granTotal } = useMemo(() => {
    const totales = new Array(meses.length).fill(0);
    let total = 0;
    protocolos.forEach((p) => {
      p.ConteoMeses.forEach((v, i) => { totales[i] += v ?? 0; total += v ?? 0; });
    });
    return { totalesMensuales: totales, granTotal: total };
  }, [meses, protocolos]);

  return (
    <div className="rounded-lg shadow-xl p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-gray-600 flex items-center">
          <i className="fa-solid fa-bars-progress mr-2"></i>Seguimiento de Consultas
        </h3>
        {/* {protocolos.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {granTotal.toLocaleString("es-MX")} atenciones
          </span>
        )} */}
      </div>
      {protocolos.length > 0 ? (
        <div className="relative overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase pb-2 pr-3">Protocolo</th>
                  {meses.map((m) => <th key={m} className="text-center text-[10px] font-bold text-gray-400 uppercase pb-2 px-1">{m}</th>)}
                  <th className="text-center text-[10px] font-bold text-sea-blue uppercase pb-2 pl-3 border-l border-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {protocolos.map((p) => {
                  const total = p.ConteoMeses.reduce((a, b) => a + (b ?? 0), 0);
                  return (
                    <tr key={p.IdProtocolo} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                        <i className="mdi mdi-stethoscope text-sea-blue mr-1"></i>
                        {p.Nombre}
                      </td>
                      {p.ConteoMeses.map((v, i) => (
                        <td key={i} className="text-center py-1.5 px-1">
                          {v > 0 ? (
                            <span className="inline-flex items-center justify-center size-5 rounded bg-sky-blue/10 text-sky-blue font-bold text-[10px]">{v}</span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center py-1.5 pl-3 font-bold text-gray-700 border-l border-gray-200">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="pt-2 pr-3 text-gray-600">Total mensual</td>
                  {totalesMensuales.map((t, i) => <td key={i} className="text-center pt-2 px-1 text-gray-600">{t}</td>)}
                  <td className="text-center pt-2 pl-3 text-sea-blue border-l border-gray-200">{granTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <ShimmerOverlay />
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">Sin protocolos de atención registrados.</div>
      )}
    </div>
  );
};

export default MatrizProtocolosChart;
