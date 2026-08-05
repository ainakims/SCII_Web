import React, { useMemo, useState } from "react";
import API_BASE_URL from "../../../config";
import { fetchWithAuth } from "../../../services/api";
import { RegistroValidado } from "../types";
import { construirPayloadResumenIA, payloadParaIA, DepartamentoResumen } from "../resumenMedicoIA";
import SectionCard from "./shared/SectionCard";
import DepartamentoCard from "./DepartamentoCard";

interface ResumenMedicoIASectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
}

interface RespuestaIA {
  resumenGeneral: { hallazgosPrincipales: string[]; recomendaciones: string[] };
  departamentos: { nombre: string; hallazgos: string[] }[];
  modelo: string;
}

// Prototipo: "Resumen médico (IA)". Coexiste con la pestaña "Resumen médico"
// (basada en reglas, sin IA). Todas las cifras se calculan en el frontend
// (resumenMedicoIA.ts); la IA solo redacta `hallazgos` por departamento y el
// resumen general — nunca hace aritmética ni ve datos de personas identificables.
const ResumenMedicoIASection: React.FC<ResumenMedicoIASectionProps> = ({ estadoActual, historico }) => {
  const [respuestaIA, setRespuestaIA] = useState<RespuestaIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPayload, setMostrarPayload] = useState(false);

  const resumen = useMemo(() => construirPayloadResumenIA(estadoActual, historico), [estadoActual, historico]);
  const payloadIA = useMemo(() => payloadParaIA(resumen), [resumen]);

  // Fusiona los `hallazgos` que regresó la IA (por nombre de depto) con los datos
  // deterministas ya calculados — la IA nunca toca las cifras.
  const departamentos: DepartamentoResumen[] = useMemo(() => {
    if (!respuestaIA) return resumen.departamentos;
    const hallazgosPorNombre = new Map(respuestaIA.departamentos.map((d) => [d.nombre, d.hallazgos]));
    return resumen.departamentos.map((d) => ({ ...d, hallazgos: hallazgosPorNombre.get(d.nombre) ?? [] }));
  }, [resumen, respuestaIA]);

  const generar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ResumenIA`, {
        method: "POST",
        body: JSON.stringify({ agregados: payloadIA }),
      });
      const json = await res.json();
      if (json?.ok) {
        setRespuestaIA({ resumenGeneral: json.resumenGeneral, departamentos: json.departamentos, modelo: json.modelo });
      } else {
        setError(json?.message || "No se pudo generar el resumen.");
      }
    } catch (err) {
      console.error("Error al generar resumen IA:", err);
      setError("Error de conexión al generar el resumen.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <SectionCard icon="creation" title="Resumen médico (IA) — prototipo" subtitle="Cifras calculadas en el dashboard; la IA solo redacta los hallazgos">
      <div className="flex items-start gap-2 bg-blue-50 text-sea-blue text-[11px] px-3 py-2 rounded-lg mb-4">
        <i className="mdi mdi-flask-outline mt-0.5"></i>
        <span>Prototipo en paralelo a "Resumen médico" (basado en reglas). Solo se envían agregados por departamento (nunca datos de personas identificables); la IA no calcula ninguna cifra, solo escribe los hallazgos.</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={generar}
          disabled={cargando || resumen.departamentos.length === 0}
          className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-0.5 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0"
        >
          <i className={`mdi ${cargando ? "mdi-loading mdi-spin" : "mdi-creation"}`}></i>
          {cargando ? "Generando..." : respuestaIA ? "Regenerar hallazgos" : "Generar hallazgos con IA"}
        </button>
        <span className="text-[11px] text-gray-400">
          {resumen.poblacionTotal.toLocaleString("es-MX")} personas · {resumen.departamentos.length} departamentos (mín. 3 personas)
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-600 text-[11px] px-3 py-2 rounded-lg mb-4">
          <i className="mdi mdi-alert-circle-outline mt-0.5"></i>
          <span>{error}</span>
        </div>
      )}

      {respuestaIA && (
        <div className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-800">Resumen general</h3>
            <span className="text-[10px] font-semibold text-gray-400 uppercase">Modelo: {respuestaIA.modelo}</span>
          </div>
          {respuestaIA.resumenGeneral.hallazgosPrincipales.length > 0 && (
            <ul className="list-disc pl-4 mb-3 space-y-1">
              {respuestaIA.resumenGeneral.hallazgosPrincipales.map((h, i) => <li key={i} className="text-xs text-gray-600">{h}</li>)}
            </ul>
          )}
          {respuestaIA.resumenGeneral.recomendaciones.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Recomendaciones ejecutivas</p>
              <ul className="list-disc pl-4 space-y-1">
                {respuestaIA.resumenGeneral.recomendaciones.map((r, i) => <li key={i} className="text-xs text-gray-600">{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {departamentos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {departamentos.map((d) => <DepartamentoCard key={d.nombre} depto={d} />)}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-gray-400">No hay departamentos con al menos 3 personas en la población seleccionada.</div>
      )}

      <button
        onClick={() => setMostrarPayload((v) => !v)}
        className="text-[11px] text-gray-400 hover:text-sea-blue transition-colors cursor-pointer flex items-center gap-1"
      >
        <i className={`mdi ${mostrarPayload ? "mdi-chevron-down" : "mdi-chevron-right"}`}></i>
        {mostrarPayload ? "Ocultar" : "Ver"} el payload de agregados que se envía al modelo
      </button>
      {mostrarPayload && (
        <pre className="mt-2 p-3 rounded-lg bg-gray-900 text-gray-100 text-[10px] overflow-x-auto max-h-96 overflow-y-auto">
          {JSON.stringify(payloadIA, null, 2)}
        </pre>
      )}
    </SectionCard>
  );
};

export default ResumenMedicoIASection;
