import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { RegistroValidado } from "../features/saludPoblacional/types";
import { construirEstadoActual } from "../features/saludPoblacional/analytics";
import { construirPayloadResumenIA } from "../features/saludPoblacional/resumenMedicoIA";

import SectionCard from "../features/saludPoblacional/components/shared/SectionCard";
import KpiCards from "../features/saludPoblacional/components/KpiCards";
import DepartamentoTabla from "../features/saludPoblacional/components/DepartamentoTabla";
import PacientesTabla, { PacienteResumen } from "../features/saludPoblacional/components/PacientesTabla";
import ExpedienteContenido from "../features/saludPoblacional/components/ExpedienteContenido";

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

const ExpedienteSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl flex items-center px-5 py-4 gap-4">
          <div className="size-12 rounded-md bg-gray-200 flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-16 rounded bg-gray-200"></div>
            <div className="h-4 w-10 rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>

    <div className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="h-4 w-40 rounded bg-gray-200"></div>
        <div className="h-8 w-64 rounded-lg bg-gray-200"></div>
      </div>
      <div className="h-[420px] rounded-lg bg-gray-100"></div>
    </div>

    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl p-6">
        <div className="h-4 w-48 rounded bg-gray-200 mb-4"></div>
        <div className="h-56 rounded-lg bg-gray-100"></div>
      </div>
    ))}
  </div>
);

const PacientesTablaSkeleton: React.FC = () => (
  <div className="h-[420px] rounded-lg bg-gray-50 overflow-hidden animate-pulse">
    <div className="h-10 bg-linear-to-r from-white to-gray-100"></div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex items-center gap-5 px-5 py-3 border-b border-gray-100 last:border-0">
        <div className="h-3 w-14 rounded bg-gray-200"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 rounded bg-gray-200"></div>
          <div className="h-2.5 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="h-3 w-28 rounded bg-gray-200"></div>
        <div className="h-3 w-24 rounded bg-gray-200"></div>
      </div>
    ))}
  </div>
);

const TABS_DEPTO = [
  { id: "departamentos", label: "Departamento", icon: "fa-building" },
  { id: "activos",       label: "Personal",     icon: "fa-user-group" },
  { id: "reingresos",    label: "Reingresos",   icon: "fa-arrows-spin" },
] as const;
type VistaDeptoTab = typeof TABS_DEPTO[number]["id"];

const TITULOS: Record<VistaDeptoTab, { titulo: string; subtitulo: string }> = {
  departamentos: {
    titulo: "Departamentos",
    subtitulo: "Resumen general por cada departamento",
  },
  activos: {
    titulo: "Personal activo",
    subtitulo: "Desgloce de personal sindicalizado y de confianza",
  },
  reingresos: {
    titulo: "Reingresos",
    subtitulo: "Prospectos que formaron parte de la plantilla",
  },
};

// Expediente: misma información que Salud Poblacional pero sin tabs ni filtros,
// todas las secciones se muestran apiladas en una sola página. Además: tabla de
// departamentos (clic -> ventana específica del departamento) con pestañas para
// alternar hacia los directorios de pacientes activos / con reingreso.
const Expediente: React.FC = () => {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroValidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaTab, setVistaTab] = useState<VistaDeptoTab>("departamentos");

  // Activos y reingresos ya NO se piden juntos por adelantado: cada uno se
  // carga completo (para que paginar dentro del tab sea instantáneo,
  // client-side) pero solo la PRIMERA vez que se abre su propio tab — así
  // "Personal" no obliga a cargar también "Reingresos" (y viceversa) si el
  // usuario nunca lo visita.
  const [pacientesActivos, setPacientesActivos] = useState<PacienteResumen[]>([]);
  const [pacientesReingresos, setPacientesReingresos] = useState<PacienteResumen[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [loadingReingresos, setLoadingReingresos] = useState(false);
  const [cargadoActivos, setCargadoActivos] = useState(false);
  const [cargadoReingresos, setCargadoReingresos] = useState(false);

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
        console.error("Error al obtener expediente:", err);
        errorModal("Error de conexión", "Ocurrió un error al obtener la información poblacional.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (vistaTab !== "activos" || cargadoActivos) return;
    setLoadingActivos(true);
    fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, { method: "POST", body: JSON.stringify({ esActivo: "1" }) })
      .then((res) => res.json())
      .then((json) => setPacientesActivos(Array.isArray(json?.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener personal activo:", err))
      .finally(() => { setLoadingActivos(false); setCargadoActivos(true); });
  }, [vistaTab, cargadoActivos]);

  useEffect(() => {
    if (vistaTab !== "reingresos" || cargadoReingresos) return;
    setLoadingReingresos(true);
    fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, { method: "POST", body: JSON.stringify({ esActivo: "0" }) })
      .then((res) => res.json())
      .then((json) => setPacientesReingresos(Array.isArray(json?.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener reingresos:", err))
      .finally(() => { setLoadingReingresos(false); setCargadoReingresos(true); });
  }, [vistaTab, cargadoReingresos]);

  const estadoActual = useMemo(() => construirEstadoActual(registros), [registros]);
  // minPoblacion=1: a diferencia del resumen de IA, la tabla debe listar TODOS
  // los departamentos reales, no solo los que superan el umbral de "reportable".
  const resumenDepartamentos = useMemo(() => construirPayloadResumenIA(estadoActual, registros, 1), [estadoActual, registros]);

  const irADepartamento = (nombreDepto: string) => {
    navigate(`/Expediente/Departamento/${encodeURIComponent(nombreDepto)}`);
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          {loading ? (
            <ExpedienteSkeleton />
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
              <i className="mdi mdi-database-off-outline text-3xl"></i>
              No hay información disponible.
            </div>
          ) : (
            <>
              <KpiCards estadoActual={estadoActual} />

              <SectionCard
                icon={`fa-solid ${TABS_DEPTO.find((t) => t.id === vistaTab)!.icon}`}
                title={TITULOS[vistaTab].titulo}
                subtitle={TITULOS[vistaTab].subtitulo}
                actions={
                  <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-md rounded-lg p-1">
                    {TABS_DEPTO.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setVistaTab(t.id)}
                        className={`w-32 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vistaTab === t.id ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                      >
                        <i className={`fa-solid ${t.icon} text-xs`}></i>
                        {t.label}
                      </button>
                    ))}
                  </div>
                }
              >
                {/* Los tres se montan una sola vez y se alternan con `hidden`
                    (no con && condicional): así cambiar de tab no vuelve a
                    renderizar la tabla completa cada vez, solo la muestra/oculta.
                    Departamentos no depende de ningún fetch propio (usa
                    `resumenDepartamentos`, ya listo apenas carga `registros`),
                    así que se muestra de inmediato sin esperar a Personal/
                    Reingresos. Personal y Reingresos sí muestran un skeleton
                    mientras se carga su propio directorio completo por
                    primera vez (después de eso, cambiar de página es
                    instantáneo: ya quedó todo en memoria). */}
                <div className={vistaTab === "departamentos" ? "" : "hidden"}>
                  <DepartamentoTabla departamentos={resumenDepartamentos.departamentos} onSeleccionar={irADepartamento} />
                </div>
                <div className={vistaTab === "activos" ? "" : "hidden"}>
                  {loadingActivos ? <PacientesTablaSkeleton /> : <PacientesTabla activo={true} pacientes={pacientesActivos} />}
                </div>
                <div className={vistaTab === "reingresos" ? "" : "hidden"}>
                  {loadingReingresos ? <PacientesTablaSkeleton /> : <PacientesTabla activo={false} pacientes={pacientesReingresos} />}
                </div>
              </SectionCard>

              <ExpedienteContenido historico={registros} mensajeVacio="No hay información disponible." />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expediente;
