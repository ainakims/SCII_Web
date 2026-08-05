import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import { RegistroValidado, Filtros, FILTROS_VACIOS } from "../features/saludPoblacional/types";
import { aplicarFiltros, construirEstadoActual } from "../features/saludPoblacional/analytics";

import FiltersBar from "../features/saludPoblacional/components/FiltersBar";
import TabNav, { TabDef } from "../features/saludPoblacional/components/TabNav";
import KpiSection from "../features/saludPoblacional/components/KpiSection";
import DemografiaSection from "../features/saludPoblacional/components/DemografiaSection";
import AntropometriaSection from "../features/saludPoblacional/components/AntropometriaSection";
import CardiovascularSection from "../features/saludPoblacional/components/CardiovascularSection";
import MetabolicoSection from "../features/saludPoblacional/components/MetabolicoSection";
import RelacionesSection from "../features/saludPoblacional/components/RelacionesSection";
import RiesgoMatrizSection from "../features/saludPoblacional/components/RiesgoMatrizSection";
import EvolucionHistoricaSection from "../features/saludPoblacional/components/EvolucionHistoricaSection";
import ResumenMedicoSection from "../features/saludPoblacional/components/ResumenMedicoSection";
import ResumenMedicoIASection from "../features/saludPoblacional/components/ResumenMedicoIASection";
import InspectorSection from "../features/saludPoblacional/components/InspectorSection";

const errorModal = (title: string, message: string) => {
  Swal.fire({
    title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
    html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
    iconHtml: `<i class="mdi mdi-alert-circle-outline" style="font-size: 90px"></i>`,
    didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
    buttonsStyling: false,
    confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
    customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
  });
};

const TABS: TabDef[] = [
  { id: "resumen", label: "Resumen", icon: "view-dashboard-outline" },
  { id: "demografia", label: "Demografía", icon: "account-multiple-outline" },
  { id: "antropometria", label: "Antropometría", icon: "human" },
  { id: "cardiovascular", label: "Cardiovascular", icon: "heart-pulse" },
  { id: "metabolico", label: "Metabólico", icon: "water-outline" },
  { id: "relaciones", label: "Relaciones", icon: "chart-scatter-plot" },
  { id: "riesgo", label: "Matriz de riesgo", icon: "grid" },
  { id: "evolucion", label: "Evolución histórica", icon: "chart-timeline-variant" },
  { id: "resumenMedico", label: "Resumen médico", icon: "file-document-outline" },
  { id: "resumenMedicoIA", label: "Resumen médico (IA)", icon: "creation" },
  { id: "auditoria", label: "Auditoría y calidad", icon: "database-search-outline" },
];

// Dashboard de Análisis de Salud Poblacional.
// El backend (/SaludPoblacional/ObtenerDatos) ya entrega los registros normalizados
// y validados (calidad de datos, sección 6-12). Aquí se filtran y agregan para
// alimentar cada bloque visual, garantizando que todos respondan al mismo contexto
// de filtrado (sección 19 del documento).
const SaludPoblacional: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroValidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [tabActiva, setTabActiva] = useState("resumen");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ObtenerDatos`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setRegistros(json.data);
        } else {
          errorModal("Error al cargar", json?.message || "No se pudo obtener la información poblacional.");
        }
      } catch (err) {
        console.error("Error al obtener salud poblacional:", err);
        errorModal("Error de conexión", "Ocurrió un error al obtener la información poblacional.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const historicoFiltrado = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const estadoActualFiltrado = useMemo(() => construirEstadoActual(historicoFiltrado), [historicoFiltrado]);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-xl gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Salud Poblacional
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Análisis del estado de salud de la población registrada: estado actual, historial, calidad de datos y relaciones entre indicadores.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-sea-blue">
              <i className="mdi mdi-loading mdi-spin text-3xl mr-3"></i>
              Cargando información poblacional...
            </div>
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
              <i className="mdi mdi-database-off-outline text-3xl"></i>
              No hay información disponible.
            </div>
          ) : (
            <>
              <FiltersBar registros={registros} filtros={filtros} onChange={setFiltros} />
              <TabNav tabs={TABS} activo={tabActiva} onChange={setTabActiva} />

              {tabActiva === "resumen" && <KpiSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "demografia" && <DemografiaSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "antropometria" && <AntropometriaSection estadoActual={estadoActualFiltrado} historico={historicoFiltrado} />}
              {tabActiva === "cardiovascular" && <CardiovascularSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "metabolico" && <MetabolicoSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "relaciones" && <RelacionesSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "riesgo" && <RiesgoMatrizSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "evolucion" && <EvolucionHistoricaSection historico={historicoFiltrado} />}
              {tabActiva === "resumenMedico" && <ResumenMedicoSection estadoActual={estadoActualFiltrado} />}
              {tabActiva === "resumenMedicoIA" && <ResumenMedicoIASection estadoActual={estadoActualFiltrado} historico={historicoFiltrado} />}
              {tabActiva === "auditoria" && <InspectorSection historico={historicoFiltrado} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaludPoblacional;
