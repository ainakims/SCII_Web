import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { RegistroValidado, RegistroConsultaValidado } from "../features/saludPoblacional/types";
import { construirEstadoActual } from "../features/saludPoblacional/analytics";
import { construirPayloadResumenIA } from "../features/saludPoblacional/resumenMedicoIA";

import SectionCard from "../features/saludPoblacional/components/shared/SectionCard";
import KpiCards from "../features/saludPoblacional/components/KpiCards";
import DepartamentoTabla from "../features/saludPoblacional/components/DepartamentoTabla";
import DashboardContenido from "../features/saludPoblacional/components/DashboardContenido";
import MatricesPoblacionalSection from "../features/saludPoblacional/components/MatricesPoblacionalSection";

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

const DashboardSkeleton: React.FC = () => (
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

// El tab "Reingresos" que vivía aquí se movió a su propia página
// (Reingresos.tsx, accesible desde el sidebar), y el tab "Personal" se movió
// a la página Pacientes.tsx (el análisis individual ahora se abre desde ahí,
// bajo la ruta /Pacientes/:matricula) — el análisis individual que se abre
// desde cualquiera de esas vistas ya no depende de esta página.
const TITULO_DEPARTAMENTOS = {
  titulo: "Departamentos",
  subtitulo: "Resumen general por cada departamento",
};

// Dashboard: misma información que Salud Poblacional pero sin tabs ni filtros,
// todas las secciones se muestran apiladas en una sola página. Además: tabla de
// departamentos (clic -> ventana específica del departamento). Personal y
// Reingresos viven aparte, en sus propias páginas (Pacientes.tsx y
// Reingresos.tsx, accesibles desde el sidebar).
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroValidado[]>([]);
  const [loading, setLoading] = useState(true);

  // Consultas puntuales (Caso 3) de toda la plantilla activa, para la matriz
  // de "Consultas por Departamento" — se piden en paralelo a `registros`.
  const [consultas, setConsultas] = useState<RegistroConsultaValidado[]>([]);

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
    fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ObtenerConsultas`, { method: "POST", body: JSON.stringify({}) })
      .then((res) => res.json())
      .then((json) => setConsultas(json?.ok && Array.isArray(json.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener consultas poblacionales:", err));
  }, []);

  const estadoActual = useMemo(() => construirEstadoActual(registros), [registros]);
  // minPoblacion=1: a diferencia del resumen de IA, la tabla debe listar TODOS
  // los departamentos reales, no solo los que superan el umbral de "reportable".
  const resumenDepartamentos = useMemo(() => construirPayloadResumenIA(estadoActual, registros, 1), [estadoActual, registros]);

  const irADepartamento = (nombreDepto: string) => {
    navigate(`/Dashboard/Departamento/${encodeURIComponent(nombreDepto)}`);
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          {loading ? (
            <DashboardSkeleton />
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
              <i className="mdi mdi-database-off-outline text-3xl"></i>
              No hay información disponible.
            </div>
          ) : (
            <>
              <KpiCards estadoActual={estadoActual} />

              <SectionCard
                icon="fa-solid fa-building"
                title={TITULO_DEPARTAMENTOS.titulo}
                subtitle={TITULO_DEPARTAMENTOS.subtitulo}
              >
                <DepartamentoTabla departamentos={resumenDepartamentos.departamentos} onSeleccionar={irADepartamento} />
              </SectionCard>

              <DashboardContenido historico={registros} mensajeVacio="No hay información disponible." />

              <MatricesPoblacionalSection estadoActual={estadoActual} historico={registros} consultas={consultas} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
