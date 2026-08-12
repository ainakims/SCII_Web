import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import KpiCard from "../features/saludPoblacional/components/shared/KpiCard";
import { RegistroValidado } from "../features/saludPoblacional/types";
import { AnalisisIndividualResult } from "../features/analisisIndividual/types";
import HeaderAnalisis from "../features/analisisIndividual/components/HeaderAnalisis";
import AnalisisIndividualSkeleton from "../features/analisisIndividual/components/AnalisisIndividualSkeleton";
import OverlayCargandoIA from "../features/analisisIndividual/components/OverlayCargandoIA";
import UltimaTomaSection from "../features/analisisIndividual/components/UltimaTomaSection";
import MatricesSection from "../features/analisisIndividual/components/MatricesSection";
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

const MESES_ABREV: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

// Fechas de HistoricosYGraficas vienen como "01/Mar/2025" (ver
// EvolucionPesoChart.tsx), no parseables directamente con `new Date()`.
function parsearFechaDDMonYYYY(fecha: string): Date | null {
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;
  const dia = Number(partes[0]);
  const mes = MESES_ABREV[partes[1].toLowerCase()];
  const anio = Number(partes[2]);
  if (!Number.isFinite(dia) || mes == null || !Number.isFinite(anio)) return null;
  const fechaObj = new Date(anio, mes, dia);
  return isNaN(fechaObj.getTime()) ? null : fechaObj;
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
  const location = useLocation();
  const matricula = matriculaParam ? decodeURIComponent(matriculaParam) : undefined;

  // Personal activo -> Evaluar; Reingresos -> EvaluarInactivos (viaja por
  // location.state igual que "nombre", puesto por PacientesTabla.tsx al
  // navegar). Si no viene (refresh directo de la URL, sin pasar por la
  // tabla), se asume activo por default.
  const esActivo = (location.state as any)?.activo !== false;

  const [resultado, setResultado] = useState<AnalisisIndividualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Historial de indicadores del empleado seleccionado (SCII_Valores_Indicadores_Por_Empleado),
  // mismo shape que /SaludPoblacional/ObtenerDatos pero acotado a esta matrícula.
  // Todavía sin usarse en las gráficas: se trae aquí, las adecuaciones de UI van después.
  const [registroEmpleado, setRegistroEmpleado] = useState<RegistroValidado[]>([]);

  // Riesgo (1/2/3) de la toma de indicadores más reciente en SCII_Indicadores
  // para esta matrícula, independiente del análisis de IA — alimenta la card
  // "Nivel de Riesgo" en HeaderAnalisis.tsx. Se ignoran lecturas sin Riesgo
  // 1/2/3 o con fecha inválida; de las que sí califican se toma la más nueva.
  const riesgoReciente = useMemo(() => {
    const candidatos: { nivel: 1 | 2 | 3; fecha: Date }[] = [];

    for (const r of registroEmpleado) {
      if (r.Riesgo !== 1 && r.Riesgo !== 2 && r.Riesgo !== 3) continue;
      if (!r.Fecha.valida || !r.Fecha.original) continue;

      const fecha = new Date(r.Fecha.original);
      if (isNaN(fecha.getTime())) continue;

      candidatos.push({ nivel: r.Riesgo, fecha });
    }

    if (candidatos.length === 0) return null;

    return candidatos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0];
  }, [registroEmpleado]);

  // Fecha más antigua entre todos los registros disponibles de este paciente
  // (consultas/indicadores en registroEmpleado, y las series históricas que
  // trae el propio Evaluar/EvaluarInactivos) — alimenta la leyenda de
  // "periodo analizado" en HeaderAnalisis.tsx.
  const fechaInicioAnalisis = useMemo(() => {
    const fechas: Date[] = [];

    for (const r of registroEmpleado) {
      if (!r.Fecha.valida || !r.Fecha.original) continue;
      const fecha = new Date(r.Fecha.original);
      if (!isNaN(fecha.getTime())) fechas.push(fecha);
    }

    if (resultado) {
      const { PresionArterial, EvolucionPesoAnual } = resultado.HistoricosYGraficas;
      for (const fechaStr of [...PresionArterial.Fechas, ...EvolucionPesoAnual.Fechas]) {
        const fecha = parsearFechaDDMonYYYY(fechaStr);
        if (fecha) fechas.push(fecha);
      }
    }

    if (fechas.length === 0) return null;
    return fechas.reduce((min, f) => (f < min ? f : min));
  }, [registroEmpleado, resultado]);

  const regresar = useCallback(() => navigate(-1), [navigate]);

  // Evita que el análisis se dispare más de una vez para la misma matrícula
  // (React.StrictMode en desarrollo monta/desmonta/vuelve a montar los efectos
  // a propósito, y sin esto se disparaban dos llamadas reales al servicio de
  // IA en paralelo — la que respondía más tarde pisaba silenciosamente el
  // resultado de la primera). Cada llamada a generar() aborta cualquier
  // petición anterior todavía en curso antes de lanzar la nueva.
  const abortRef = useRef<AbortController | null>(null);

  const generar = useCallback(async () => {
    if (!matricula) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const endpoint = esActivo ? "Evaluar" : "EvaluarInactivos";
      const res = await fetchWithAuth(`${API_BASE_URL}/AnalisisIndividual/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ matricula: matricula.trim() }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (json?.ok) {
        setResultado(json.data);
      } else {
        setError(json?.message || "No se pudo generar el análisis.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Error al generar análisis individual:", err);
      setError("Error de conexión al generar el análisis.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [matricula, esActivo]);

  useEffect(() => {
    if (matricula) generar();
    return () => { abortRef.current?.abort(); };
  }, [matricula, generar]);

  useEffect(() => {
    if (!matricula) return;
    const controller = new AbortController();
    fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ObtenerDatosPorEmpleado`, {
      method: "POST",
      body: JSON.stringify({ matricula: matricula.trim() }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => setRegistroEmpleado(json?.ok && Array.isArray(json.data) ? json.data : []))
      .catch((err) => { if (err?.name !== "AbortError") console.error("Error al obtener indicadores del empleado:", err); });
    return () => controller.abort();
  }, [matricula]);

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
          {loading && !resultado && <AnalisisIndividualSkeleton />}
          {loading && <OverlayCargandoIA />}

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
                      icon="gauge-high"
                      label="Presión arterial"
                      value={sistolica && diastolica ? `${sistolica.valor}/${diastolica.valor} mmHg` : "N/A"}
                    />
                    <KpiCard
                      icon="scale-balanced"
                      label="IMC"
                      value={imc ? `${imc.valor} kg/m²` : "N/A"}
                    />
                    <KpiCard
                      icon="heart-pulse"
                      label="Frecuencia cardiaca"
                      value={fc ? `${fc.valor} bpm` : "N/A"}
                    />
                    <KpiCard
                      icon="weight-scale"
                      label="Peso actual"
                      value={peso ? `${peso.valor} kg` : ""}
                    />
                  </div>
                );
              })()}
              <HeaderAnalisis prioridad={resultado.PrioridadYUrgencia} aptitud={resultado.AptitudLaboral} matricula={matricula} riesgoReciente={riesgoReciente} fechaInicioAnalisis={fechaInicioAnalisis} />
              {/* Oculto (no eliminado): "Enfermedades registradas" no se va a ocupar por ahora. */}
              {/* <EnfermedadesBadges enfermedades={resultado.HistoricosYGraficas.Enfermedades} /> */}
              <UltimaTomaSection
                meses={resultado.HistoricosYGraficas.Meses}
                peso={resultado.HistoricosYGraficas.EvolucionPesoAnual}
                presion={resultado.HistoricosYGraficas.PresionArterial}
                imc={resultado.HistoricosYGraficas.EvolucionIMC}
                perfilMetabolico={resultado.HistoricosYGraficas.PerfilMetabolico}
              />
              <MatricesSection
                heatmap={resultado.HistoricosYGraficas.HeatmapAsistencia}
                protocolos={resultado.HistoricosYGraficas.MatrizProtocolos}
              />
              <HallazgosSection hallazgos={resultado.HallazgosRelevantes} />
              <DiagnosticoSection diagnostico={resultado.DiagnosticoDiferencial} />
              {/* Oculto (no eliminado): "Factores de incertidumbre registrados" no se va a ocupar por ahora. */}
              {/* <IncertidumbreSection evolucion={resultado.EvolucionYRiesgosPotenciales} /> */}
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
