import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthToken";

import KpiCard from "../features/saludPoblacional/components/shared/KpiCard";
import AnalisisIndividualSkeleton from "../features/analisisIndividual/components/AnalisisIndividualSkeleton";
import UltimaTomaSection from "../features/analisisIndividual/components/UltimaTomaSection";
import MatricesSection from "../features/analisisIndividual/components/MatricesSection";
import { RegistroValidado } from "../features/saludPoblacional/types";
import { ConsultaPropia } from "../features/dashboardUsuario/types";
import { construirGraficasPropias } from "../features/dashboardUsuario/construirGraficas";

// Último valor no nulo de una serie histórica (y su etiqueta correspondiente),
// recorriendo de más reciente a más antiguo. Copiado de AnalisisIndividual.tsx.
function ultimoValido<T>(valores: T[], etiquetas: string[]): { valor: T; etiqueta: string } | null {
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) return { valor: valores[i], etiqueta: etiquetas[i] ?? "" };
  }
  return null;
}

// Versión simplificada de AnalisisIndividual.tsx para el propio usuario: solo
// KPIs, gráficas y matrices de seguimiento, sin análisis de IA. A diferencia
// de AnalisisIndividual, no llama a AnalisisIndividual/Evaluar (dispara el
// análisis de IA vía SOAP externo, fuera de alcance aquí): trae datos crudos
// propios (SCII_Indicadores + SCII_Consultas, filtrados por matrícula server-side
// en DashboardUsuario/ObtenerResumenPropio) y arma las mismas gráficas en el
// frontend (ver construirGraficasPropias).
const DashboardUsuario: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string } | null };
  const navigate = useNavigate();

  useEffect(() => {
    const esPrivilegiado = ["admin", "médico", "medico"].includes(
      (user?.rol ?? "").toLowerCase().trim()
    );
    if (esPrivilegiado) {
      navigate("/Dashboard");
    }
  }, [user, navigate]);

  const [registros, setRegistros] = useState<RegistroValidado[]>([]);
  const [consultas, setConsultas] = useState<ConsultaPropia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sin guard de "solo una vez": en React.StrictMode (dev) el efecto se
  // monta/desmonta/vuelve a montar a propósito, y con un guard aquí el abort()
  // del cleanup cancelaba la única petición permitida sin volver a dispararla
  // (loading se quedaba en true para siempre). abortRef sí evita carreras
  // reales (una petición más vieja pisando una más nueva).
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/DashboardUsuario/ObtenerResumenPropio`, {
          method: "POST",
          signal: controller.signal,
        });
        const json = await res.json();
        if (controller.signal.aborted) return;
        if (json?.ok) {
          setRegistros(Array.isArray(json.data?.registros) ? json.data.registros : []);
          setConsultas(Array.isArray(json.data?.consultas) ? json.data.consultas : []);
        } else {
          setError(json?.message || "No se pudo obtener tu información de salud.");
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Error al obtener el resumen del usuario:", err);
        setError("Error de conexión al obtener tu información de salud.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const graficas = useMemo(() => construirGraficasPropias(registros, consultas), [registros, consultas]);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-6">
          {loading && <AnalisisIndividualSkeleton />}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl shadow-md">
              <i className="mdi mdi-alert-circle-outline mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {(() => {
                const { presionArterial, evolucionIMC, evolucionPesoAnual } = graficas;
                const sistolica = ultimoValido(presionArterial.Sistolica, presionArterial.Fechas);
                const diastolica = ultimoValido(presionArterial.Diastolica, presionArterial.Fechas);
                const fc = ultimoValido(presionArterial.FrecuenciaCardiaca, presionArterial.Fechas);
                const imc = ultimoValido(evolucionIMC.ValoresIMC, graficas.meses);
                const peso = ultimoValido(evolucionPesoAnual.PesoReal, evolucionPesoAnual.Fechas);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard
                      icon="gauge-high"
                      label="Presión arterial"
                      value={sistolica && diastolica ? `${sistolica.valor}/${diastolica.valor} mmHg` : "N/A"}
                    />
                    <KpiCard icon="scale-balanced" label="IMC" value={imc ? `${imc.valor} kg/m²` : "N/A"} />
                    <KpiCard
                      icon="heart-pulse"
                      label="Frecuencia cardiaca"
                      value={fc ? `${fc.valor} bpm` : "N/A"}
                    />
                    <KpiCard icon="weight-scale" label="Peso actual" value={peso ? `${peso.valor} kg` : "N/A"} />
                  </div>
                );
              })()}
              <UltimaTomaSection
                meses={graficas.meses}
                peso={graficas.evolucionPesoAnual}
                presion={graficas.presionArterial}
                imc={graficas.evolucionIMC}
                perfilMetabolico={graficas.perfilMetabolico}
              />
              <MatricesSection heatmap={graficas.heatmapAsistencia} protocolos={graficas.matrizProtocolos} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardUsuario;
