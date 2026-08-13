import React, { FC, useEffect, useRef, useState } from "react";
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
  '/Agenda':        { label: 'Agenda',        icon: 'mdi-calendar-blank' },
  '/Consultas':     { label: 'Consultas',     icon: 'mdi-clipboard-pulse-outline' },
  '/Recetas':       { label: 'Recetas',       icon: 'mdi-pill' },
  '/Inventario':    { label: 'Inventario',    icon: 'mdi-package-variant-closed' },
  '/Documentos':    { label: 'Documentos',    icon: 'mdi-file-document-outline' },
  '/Configuracion': { label: 'Configuración', icon: 'mdi-cog-outline' },
  '/Expediente': { label: 'Expediente', icon: 'mdi-folder-account-outline' },
};

// Rutas dinámicas bajo /Expediente: no tienen una entrada propia en
// PAGE_TITLES (el valor es variable), así que se detectan aparte para mostrar
// el breadcrumb "Expediente > ..." con "Expediente" como link de regreso.
// - /Expediente/Departamento/:nombre -> nombre de departamento en la URL.
// - /Expediente/:matricula (un solo segmento, no "Departamento") -> matrícula
//   del paciente en la URL; el nombre viaja por location.state (lo pone
//   PacientesTabla.tsx al navegar) y es opcional: en un refresh directo de la
//   URL no está disponible y solo se muestra la matrícula.
const RUTA_EXPEDIENTE_DEPTO = /^\/Expediente\/Departamento\/(.+)$/;
const RUTA_EXPEDIENTE_PACIENTE = /^\/Expediente\/([^/]+)$/;

const Topbar: FC<TopbarProps> = ({ toggleSidebar, isCollapsed }) => {
  const location = useLocation();
  const matchDepto = location.pathname.match(RUTA_EXPEDIENTE_DEPTO);
  const nombreDepto = matchDepto ? decodeURIComponent(matchDepto[1]) : null;
  const matchPaciente = !matchDepto ? location.pathname.match(RUTA_EXPEDIENTE_PACIENTE) : null;
  const matriculaPaciente = matchPaciente ? decodeURIComponent(matchPaciente[1]) : null;
  const nombrePaciente = (location.state as any)?.nombre as string | undefined;
  const page = (nombreDepto || matriculaPaciente) ? PAGE_TITLES["/Expediente"] : PAGE_TITLES[location.pathname];

  const { user, logout } = useAuth() as { user: User; logout: () => void };

  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/LoginToken");
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event: MouseEvent): void => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const getInitials = (name: string | undefined): string => {
    if (!name) return "DR";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <header
      className={`h-16 bg-white/70 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4 sm:px-5 lg:px-5 fixed top-0 right-0 z-10 transition-all duration-300 ${
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
                    onClick={() => navigate("/Expediente")}
                    className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer transition-colors"
                  >
                    {page.label}
                  </button>
                  <i className="mdi mdi-chevron-right text-gray-300"></i>
                  <span className="truncate text-sea-blue">{nombreDepto}</span>
                </>
              ) : matriculaPaciente ? (
                <>
                  <button
                    onClick={() => navigate("/Expediente")}
                    className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer transition-colors"
                  >
                    {page.label}
                  </button>
                  <i className="mdi mdi-chevron-right text-gray-300"></i>
                  <span className="truncate text-sea-blue">{nombrePaciente ? `${matriculaPaciente} - ${nombrePaciente}` : matriculaPaciente}</span>
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
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-linear-to-b from-sea-blue to-sky-blue shadow-sm hover:opacity-90 transition-all cursor-pointer"
            title={user?.nombre}
          >
            {getInitials(user?.nombre)}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
              <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white bg-linear-to-b from-sea-blue to-sky-blue shadow-sm">
                  {getInitials(user?.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate uppercase" title={user?.nombre}>
                    {user?.nombre || ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={user?.puesto}>
                    {user?.puesto || user?.rol}
                  </p>
                  {user?.correo && (
                    <p className="text-xs text-gray-400 truncate" title={user.correo}>
                      {user.correo}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;