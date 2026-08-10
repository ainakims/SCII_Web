import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import KpiCard from "../features/saludPoblacional/components/shared/KpiCard";
import { AnalisisIndividualResult } from "../features/analisisIndividual/types";
import HeaderAnalisis from "../features/analisisIndividual/components/HeaderAnalisis";
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

// Último valor no nulo de una serie histórica (y su etiqueta correspondiente),
// recorriendo de más reciente a más antiguo.
function ultimoValido<T>(valores: T[], etiquetas: string[]): { valor: T; etiqueta: string } | null {
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) return { valor: valores[i], etiqueta: etiquetas[i] ?? "" };
  }
  return null;
}

// Análisis Individual: consume el servicio SOAP externo EvaluarSaludConAnalisisIA
// (EvaluacionSalud.asmx, repo aparte — ver memoria de proyecto) a través del
// backend de SCII_Web. El backend decide `esUsuarioMedico` a partir del rol del
// JWT, nunca del cliente, porque controla si el servicio regresa contenido
// clínico sensible (diagnóstico diferencial, aptitud laboral detallada).
//
// Vista de página completa (mismo patrón que ExpedienteDepartamento.tsx), no
// drawer/modal: se accede desde Expediente > Personal/Reingresos al hacer
// clic sobre un paciente. Ruta /Expediente/:matricula (ver Topbar.tsx para el
// breadcrumb "Expediente > Matrícula - Nombre"); el nombre viaja por
// location.state (solo disponible al navegar desde la tabla, no en un
// refresh directo de la URL) y es puramente decorativo, nunca se usa para
// las llamadas al backend.
const AnalisisIndividual: React.FC = () => {
  const { matricula: matriculaParam } = useParams<{ matricula: string }>();
  const navigate = useNavigate();
  const matricula = matriculaParam ? decodeURIComponent(matriculaParam) : undefined;

  const [resultado, setResultado] = useState<AnalisisIndividualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regresar = useCallback(() => navigate(-1), [navigate]);

  const generar = useCallback(async () => {
    if (!matricula) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/AnalisisIndividual/Evaluar`, {
        method: "POST",
        body: JSON.stringify({ matricula: matricula.trim() }),
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
      <div className="relative flex w-full overflow-hidden">
        <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto px-4 pb-6">
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3 bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl">
              <i className="mdi mdi-account-search-outline text-3xl"></i>
              <p className="text-sm">No se especificó ningún paciente.</p>
              <button
                onClick={regresar}
                className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                <i className="mdi mdi-arrow-left"></i>
                Regresar
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
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-6">
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
              {(() => {
                const { PresionArterial, EvolucionIMC, EvolucionPesoAnual, Meses } = resultado.HistoricosYGraficas;
                const sistolica = ultimoValido(PresionArterial.Sistolica, PresionArterial.Fechas);
                const diastolica = ultimoValido(PresionArterial.Diastolica, PresionArterial.Fechas);
                const fc = ultimoValido(PresionArterial.FrecuenciaCardiaca, PresionArterial.Fechas);
                const imc = ultimoValido(EvolucionIMC.ValoresIMC, Meses);
                const peso = ultimoValido(EvolucionPesoAnual.PesoReal, EvolucionPesoAnual.Fechas);
                const pesoIdeal = ultimoValido(EvolucionPesoAnual.PesoIdeal, EvolucionPesoAnual.Fechas);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard
                      icon="mdi-heart-pulse"
                      label="Presión arterial"
                      value={sistolica && diastolica ? `${sistolica.valor}/${diastolica.valor} mmHg` : "Sin dato"}
                    />
                    <KpiCard
                      icon="mdi-scale-bathroom"
                      label="IMC"
                      value={imc ? `${imc.valor} kg/m²` : "Sin dato"}
                    />
                    <KpiCard
                      icon="mdi-pulse"
                      label="Frecuencia cardiaca"
                      value={fc ? `${fc.valor} bpm` : "Sin dato"}
                    />
                    <KpiCard
                      icon="mdi-weight-kilogram"
                      label="Peso vs. meta"
                      value={peso ? `${peso.valor} kg${pesoIdeal ? ` (meta ${pesoIdeal.valor})` : ""}` : "Sin dato"}
                    />
                  </div>
                );
              })()}
              <HeaderAnalisis prioridad={resultado.PrioridadYUrgencia} aptitud={resultado.AptitudLaboral} />
              <EnfermedadesBadges enfermedades={resultado.HistoricosYGraficas.Enfermedades} />
              <EvolucionPesoChart datos={resultado.HistoricosYGraficas.EvolucionPesoAnual} />
              <PresionArterialChart datos={resultado.HistoricosYGraficas.PresionArterial} />
              <EvolucionImcChart meses={resultado.HistoricosYGraficas.Meses} evolucion={resultado.HistoricosYGraficas.EvolucionIMC} />
              <PerfilMetabolicoChart meses={resultado.HistoricosYGraficas.Meses} perfil={resultado.HistoricosYGraficas.PerfilMetabolico} />
              <HeatmapAsistencia meses={resultado.HistoricosYGraficas.HeatmapAsistencia} />
              <MatrizProtocolosChart meses={resultado.HistoricosYGraficas.Meses} protocolos={resultado.HistoricosYGraficas.MatrizProtocolos} />
              <HallazgosSection hallazgos={resultado.HallazgosRelevantes} />
              <DiagnosticoSection diagnostico={resultado.DiagnosticoDiferencial} />
              <IncertidumbreSection evolucion={resultado.EvolucionYRiesgosPotenciales} />
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={generar}
              disabled={loading}
              title={resultado ? "Regenerar análisis" : "Generar análisis"}
              className="flex items-center gap-2 border border-gray-100 shadow-md bg-white text-gray-600 hover:text-sea-blue px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className={`mdi ${loading ? "mdi-loading mdi-spin" : "mdi-refresh"}`}></i>
              Regenerar
            </button>
            <button
              onClick={programarSeguimiento}
              className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="mdi mdi-calendar-check-outline"></i>
              Programar Seguimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisIndividual;
