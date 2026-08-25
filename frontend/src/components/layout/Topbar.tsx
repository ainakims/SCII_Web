import React, { FC } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthToken";

interface PageTitle {
  label: string;
  icon: string;
  subtitle?: string;
}

interface PageTitles {
  [key: string]: PageTitle;
}

interface TopbarProps {
  toggleSidebar: () => void;
  isCollapsed: boolean;
}

interface User {
  nombre?: string;
  cuenta?: string;
  puesto?: string;
  matricula?: string;
  correo?: string;
  rol?: string;
}

const PAGE_TITLES: PageTitles = {
  '/Dashboard':     { label: 'Dashboard',    icon: 'mdi-view-dashboard-outline' },
  '/Pacientes':     { label: 'Pacientes',     icon: 'mdi-account-multiple-outline' },
  '/Reingresos':    { label: 'Reingresos',    icon: 'mdi-account-switch-outline' },
  '/Incapacidad':   { label: 'Incapacidades',  icon: 'mdi-wheelchair-accessibility' },
  '/Agenda':        { label: 'Agenda',        icon: 'mdi-calendar-blank' },
  '/Consultas':     { label: 'Consultas',     icon: 'mdi-clipboard-pulse-outline' },
  '/Indicadores':   { label: 'Indicadores',   icon: 'mdi-heart-pulse' },
  '/Evaluacion':    { label: 'Evaluación',    icon: 'mdi-clipboard-check-outline' },
  '/Recetas':       { label: 'Recetas',       icon: 'mdi-pill' },
  '/Inventario':    { label: 'Inventario',    icon: 'mdi-package-variant-closed' },
  '/Documentos':    { label: 'Documentos',    icon: 'mdi-file-document-outline' },
  '/Configuracion': { label: 'Configuración', icon: 'mdi-cog-outline' },
  '/Dashboard': { label: 'Dashboard', icon: 'mdi-folder-account-outline' },
};

// Ruta dinámica /Dashboard/Departamento/:nombre: no tiene una entrada propia
// en PAGE_TITLES (el valor es variable), así que se detecta aparte para
// mostrar el breadcrumb "Dashboard > ..." con "Dashboard" como link de
// regreso.
const RUTA_DASHBOARD_DEPTO = /^\/Dashboard\/Departamento\/(.+)$/;
// El análisis individual entrado desde Pacientes.tsx vive bajo su propia
// sección (/Pacientes/:matricula, ver basePath en PacientesTabla.tsx), con
// el mismo criterio de breadcrumb que Dashboard pero regresando a
// /Pacientes en vez de /Dashboard.
const RUTA_PACIENTES_PACIENTE = /^\/Pacientes\/([^/]+)$/;
// El análisis individual entrado desde Reingresos.tsx vive bajo su propia
// sección (/Reingresos/:matricula, ver basePath en PacientesTabla.tsx), con
// el mismo criterio de breadcrumb que Dashboard pero regresando a
// /Reingresos en vez de /Dashboard.
const RUTA_REINGRESOS_PACIENTE = /^\/Reingresos\/([^/]+)$/;
// El detalle de un trabajador entrado desde Indicadores.tsx vive bajo su
// propia sección (/Indicadores/:matricula), mismo criterio de breadcrumb que
// Pacientes/Reingresos pero regresando a /Indicadores.
const RUTA_INDICADORES_PACIENTE = /^\/Indicadores\/([^/]+)$/;

const Topbar: FC<TopbarProps> = ({ toggleSidebar, isCollapsed }) => {
  const location = useLocation();
  const matchDepto = location.pathname.match(RUTA_DASHBOARD_DEPTO);
  const nombreDepto = matchDepto ? decodeURIComponent(matchDepto[1]) : null;
  const matchPaciente = !matchDepto ? location.pathname.match(RUTA_PACIENTES_PACIENTE) : null;
  const matriculaPaciente = matchPaciente ? decodeURIComponent(matchPaciente[1]) : null;
  const matchReingreso = (!matchDepto && !matchPaciente) ? location.pathname.match(RUTA_REINGRESOS_PACIENTE) : null;
  const matriculaReingreso = matchReingreso ? decodeURIComponent(matchReingreso[1]) : null;
  const matchIndicadores = (!matchDepto && !matchPaciente && !matchReingreso) ? location.pathname.match(RUTA_INDICADORES_PACIENTE) : null;
  const matriculaIndicadores = matchIndicadores ? decodeURIComponent(matchIndicadores[1]) : null;
  const nombrePaciente = (location.state as any)?.nombre as string | undefined;
  const seccionBase = matriculaReingreso ? "/Reingresos" : matriculaPaciente ? "/Pacientes" : matriculaIndicadores ? "/Indicadores" : "/Dashboard";
  const page = (nombreDepto || matriculaPaciente || matriculaReingreso || matriculaIndicadores) ? PAGE_TITLES[seccionBase] : PAGE_TITLES[location.pathname];

  const { user, logout } = useAuth() as { user: User; logout: () => void };

  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/LoginToken");
  };

  return (
    <header
      className={`h-16 bg-white backdrop-blur-md shadow-xs flex items-center justify-between px-4 sm:px-5 lg:px-5 fixed top-0 right-0 z-50 transition-all duration-300 ${
        isCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"
      }`}
    >
      <div className="flex items-center flex-1">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 -ml-2 text-gray-400 hover:text-sea-blue flex items-center justify-center transition-all group cursor-pointer"
        >
          <i className="fa-solid fa-bars"></i>
          {/* rotate-90 */}
        </button>

        {page && (
          <div className="ml-3 min-w-0">
            <p className="text-sm font-bold truncate flex items-center gap-1">
              {nombreDepto ? (
                <>
                  <button
                    onClick={() => navigate(seccionBase)}
                    className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer transition-colors"
                  >
                    {page.label}
                  </button>
                  <i className="mdi mdi-chevron-right text-gray-300"></i>
                  <span className="truncate text-sea-blue">{nombreDepto}</span>
                </>
              ) : (matriculaPaciente || matriculaReingreso || matriculaIndicadores) ? (
                <>
                  <button
                    onClick={() => navigate(seccionBase)}
                    className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer transition-colors"
                  >
                    {page.label}
                  </button>
                  <i className="mdi mdi-chevron-right text-gray-300"></i>
                  <span className="truncate text-sea-blue">
                    {(() => {
                      const matricula = matriculaPaciente || matriculaReingreso || matriculaIndicadores;
                      return nombrePaciente ? `${matricula} - ${nombrePaciente}` : matricula;
                    })()}
                  </span>
                </>
              ) : (
                <span className="text-sea-blue">{page.label}</span>
              )}
            </p>
            {page.subtitle && (
              <p className="text-xs text-gray-500 truncate hidden md:block max-w-md">{page.subtitle}</p>
            )}
          </div>
        )}

        {/* <div className="ml-4 md:ml-0 flex-1 max-w-lg hidden sm:flex">
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                    <Search className="h-5 w-5" />
                </div>
                <input
                    type="text"
                    className="block w-full h-10 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-clinical-blue focus:border-clinical-blue sm:text-sm transition-colors duration-200"
                    placeholder="Buscar paciente, expediente o consulta..."
                />
            </div>
        </div> */}
      </div>

      <div className="ml-4 flex items-center space-x-4">
        {/* <button 
          className="w-10 h-10 text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-xl transition-all relative cursor-pointer"
          // className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
        >
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
          <i className="mdi mdi-bell-outline text-[22px]"></i>
        </button> */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 ml-1 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all group cursor-pointer"
          title="Cerrar Sesión"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </header>
  );
};

export default Topbar;