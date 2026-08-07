import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
const AnalisisIndividual: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const matricula: string | undefined = (location.state as any)?.matricula;

  const [resultado, setResultado] = useState<AnalisisIndividualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!matricula) {
    return (
      <div className="relative flex w-full overflow-hidden">
        <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
              <i className="mdi mdi-account-search-outline text-3xl"></i>
              <p className="text-sm">No se especificó ningún paciente.</p>
              <button
                onClick={() => navigate("/Pacientes")}
                className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                <i className="mdi mdi-arrow-left"></i>
                Ir a Pacientes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-xl gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Análisis Individual
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Matrícula: <b>{matricula}</b> — evaluación clínica generada con IA sobre el historial del usuario.
              </p>
            </div>
            <button
              onClick={generar}
              disabled={loading}
              className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-0.5 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0"
            >
              <i className={`mdi ${loading ? "mdi-loading mdi-spin" : "mdi-refresh"}`}></i>
              {loading ? "Generando..." : resultado ? "Regenerar" : "Generar análisis"}
            </button>
          </div>

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
              <MetricasDestacadas historicos={resultado.HistoricosYGraficas} />
              <EvolucionPesoChart datos={resultado.HistoricosYGraficas.EvolucionPesoAnual} />
              <PresionArterialChart datos={resultado.HistoricosYGraficas.PresionArterial} />
              <EvolucionImcChart meses={resultado.HistoricosYGraficas.Meses} evolucion={resultado.HistoricosYGraficas.EvolucionIMC} />
              <PerfilMetabolicoChart meses={resultado.HistoricosYGraficas.Meses} perfil={resultado.HistoricosYGraficas.PerfilMetabolico} />
              <HeatmapAsistencia meses={resultado.HistoricosYGraficas.HeatmapAsistencia} />
              <MatrizProtocolosChart meses={resultado.HistoricosYGraficas.Meses} protocolos={resultado.HistoricosYGraficas.MatrizProtocolos} />
              <HallazgosSection hallazgos={resultado.HallazgosRelevantes} />
              <DiagnosticoSection diagnostico={resultado.DiagnosticoDiferencial} />
              <IncertidumbreSection evolucion={resultado.EvolucionYRiesgosPotenciales} />
              <EnfermedadesBadges enfermedades={resultado.HistoricosYGraficas.Enfermedades} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalisisIndividual;
