import React, { FC } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthToken";

interface PageTitle {
  label: string;
  icon: string;
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
};

const Topbar: FC<TopbarProps> = ({ toggleSidebar, isCollapsed }) => {
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname];

  const { user, logout } = useAuth() as { user: User; logout: () => void };

  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/LoginToken");
  };

  return (
    <header
      className={`h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-5 lg:px-5 fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"}`}
    >
      <div className="flex items-center flex-1">
        <button
          onClick={toggleSidebar}
          className="px-2 -ml-2 text-gray-400 hover:text-sea-blue bg-linear-to-b hover:from-sea-blue/10 hover:to-gray-50 rounded-md cursor-pointer transition-colors"
        >
          <i className="mdi mdi-menu text-[25px]"></i>
        </button>

        {/* {page && (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-md font-bold upper ml-2">
              {page.label}
            </span>
          </div>
        )} */}

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
          className="w-10 h-10 ml-1 text-gray-400 hover:text-red-500 bg-linear-to-b hover:from-red-100 hover:to-gray-50 rounded-xl flex items-center justify-center transition-all group cursor-pointer"
          title="Cerrar Sesión"
        >
          <i className="mdi mdi-run-fast"></i>
        </button>
      </div>
    </header>
  );
};

export default Topbar;