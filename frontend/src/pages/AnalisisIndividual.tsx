import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { AnalisisIndividualResult } from "../features/analisisIndividual/types";
import HeaderAnalisis from "../features/analisisIndividual/components/HeaderAnalisis";
import MetricasDestacadas from "../features/analisisIndividual/components/MetricasDestacadas";
import EvolucionPesoChart from "../features/analisisIndividual/components/EvolucionPesoChart";
import PresionArterialChart from "../features/analisisIndividual/components/PresionArterialChart";
import EvolucionImcChart from "../features/analisisIndividual/components/EvolucionImcChart";
import PerfilMetabolicoChart from "../features/analisisIndividual/components/PerfilMetabolicoChart";
import HeatmapAsistencia from "../features/analisisIndividual/components/HeatmapAsistencia";
import MatrizProtocolosChart from "../features/analisisIndividual/components/MatrizProtocolosChart";
import HallazgosSection from "../features/analisisIndividual/components/HallazgosSection";
import DiagnosticoSection from "../features/analisisIndividual/components/DiagnosticoSection";
import IncertidumbreSection from "../features/analisisIndividual/components/IncertidumbreSection";
import EnfermedadesBadges from "../features/analisisIndividual/components/EnfermedadesBadges";

// Análisis Individual: consume el servicio SOAP externo EvaluarSaludConAnalisisIA
// (EvaluacionSalud.asmx, repo aparte — ver memoria de proyecto) a través del
// backend de SCII_Web. El backend decide `esUsuarioMedico` a partir del rol del
// JWT, nunca del cliente, porque controla si el servicio regresa contenido
// clínico sensible (diagnóstico diferencial, aptitud laboral detallada).
//
// Se presenta como drawer (no ruta de página completa) para replicar el
// mockup de referencia del usuario: overlay + panel fijo desde la derecha.
const AnalisisIndividual: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const matricula: string | undefined = (location.state as any)?.matricula;

  const [resultado, setResultado] = useState<AnalisisIndividualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = useCallback(() => navigate("/Pacientes"), [navigate]);

  const generar = useCallback(async () => {
    if (!matricula) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/AnalisisIndividual/Evaluar`, {
        method: "POST",
        body: JSON.stringify({ matricula }),
      });
      const json = await res.json();
      if (json?.ok) {
        setResultado(json.data);
      } else {
        setError(json?.message || "No se pudo generar el análisis.");
      }
    } catch (err) {
      console.error("Error al generar análisis individual:", err);
      setError("Error de conexión al generar el análisis.");
    } finally {
      setLoading(false);
    }
  }, [matricula]);

  useEffect(() => {
    if (matricula) generar();
  }, [matricula, generar]);

  const programarSeguimiento = () => {
    Swal.fire({
      icon: "info",
      title: "Próximamente",
      text: "La programación de seguimiento estará disponible en una próxima versión.",
      confirmButtonColor: "#002E6D",
    });
  };

  if (!matricula) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={cerrar}>
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-3 text-gray-400" onClick={(e) => e.stopPropagation()}>
          <i className="mdi mdi-account-search-outline text-3xl"></i>
          <p className="text-sm">No se especificó ningún paciente.</p>
          <button
            onClick={cerrar}
            className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
          >
            <i className="mdi mdi-arrow-left"></i>
            Ir a Pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={cerrar}>
      <div className="w-full max-w-[660px] h-full bg-gray-50 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-linear-to-br from-sea-blue to-sky-blue flex items-center justify-center shrink-0">
              <i className="mdi mdi-hospital-box-outline text-white text-lg"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-800 truncate">Análisis Médico Integral</h1>
              <p className="text-xs text-gray-500 truncate">
                Matrícula: <b>{matricula}</b> — evaluación clínica generada con IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={generar}
              disabled={loading}
              title={resultado ? "Regenerar análisis" : "Generar análisis"}
              className="size-9 flex items-center justify-center rounded-lg text-sea-blue hover:bg-sea-blue/10 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className={`mdi ${loading ? "mdi-loading mdi-spin" : "mdi-refresh"} text-lg`}></i>
            </button>
            <button
              onClick={cerrar}
              title="Cerrar"
              className="size-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <i className="mdi mdi-close text-lg"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && !resultado && (
            <div className="flex items-center justify-center py-24 text-sea-blue">
              <i className="mdi mdi-loading mdi-spin text-3xl mr-3"></i>
              Generando análisis con IA...
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl shadow-md">
              <i className="mdi mdi-alert-circle-outline mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {resultado && (
            <>
              <HeaderAnalisis prioridad={resultado.PrioridadYUrgencia} aptitud={resultado.AptitudLaboral} />
              <EnfermedadesBadges enfermedades={resultado.HistoricosYGraficas.Enfermedades} />
              <MetricasDestacadas historicos={resultado.HistoricosYGraficas} />              
              <EvolucionPesoChart datos={resultado.HistoricosYGraficas.EvolucionPesoAnual} />
              <PresionArterialChart datos={resultado.HistoricosYGraficas.PresionArterial} />
              <EvolucionImcChart meses={resultado.HistoricosYGraficas.Meses} evolucion={resultado.HistoricosYGraficas.EvolucionIMC} />
              <PerfilMetabolicoChart meses={resultado.HistoricosYGraficas.Meses} perfil={resultado.HistoricosYGraficas.PerfilMetabolico} />
              <HeatmapAsistencia anios={resultado.HistoricosYGraficas.HeatmapAsistencia} />
              <MatrizProtocolosChart protocolos={resultado.HistoricosYGraficas.MatrizProtocolos} />
              <HallazgosSection hallazgos={resultado.HallazgosRelevantes} />
              <DiagnosticoSection diagnostico={resultado.DiagnosticoDiferencial} />
              <IncertidumbreSection evolucion={resultado.EvolucionYRiesgosPotenciales} />
              
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-white border-t border-gray-100 shrink-0">
          <button
            onClick={cerrar}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={programarSeguimiento}
            className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
          >
            <i className="mdi mdi-calendar-check-outline"></i>
            Programar Seguimiento
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalisisIndividual;
