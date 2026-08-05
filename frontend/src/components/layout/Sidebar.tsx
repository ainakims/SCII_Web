import React, { FC } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  Box,
  ActivitySquare,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import tngsanoLogo from "../../assets/img/logo_tngsano.png";
import tngsanoIcono from "../../assets/img/icono_tgnsano.png";
import { useAuth } from "../../context/AuthToken";

type Rol = "admin" | "médico" | "enfermero" | "usuario";

interface MenuItem {
  name: string;
  icon: string;
  path: string;
  roles: Rol[];
}

interface User {
  nombre?: string;
  cuenta?: string;
  puesto?: string;
  matricula?: string;
  correo?: string;
  rol: string;
}

interface SidebarProps {
  isCollapsed: boolean;
}

const ROLES_PRIVILEGIADOS = ["admin", "médico", "medico"];

const Sidebar: FC<SidebarProps> = ({ isCollapsed }) => {
  const menuItems: MenuItem[] = [
    // { name: "Dashboard",     icon: "view-dashboard",          path: "/Dashboard",     roles: ["admin", "médico"] }, //compass
    { name: "Pacientes",     icon: "account-multiple",        path: "/Pacientes",     roles: ["admin", "médico", "enfermero"] },
    { name: "Agenda",        icon: "calendar-clock",          path: "/Agenda",        roles: ["admin", "médico", "enfermero", "usuario"] },
    { name: "Consultas",     icon: "clipboard-pulse-outline", path: "/Consultas",     roles: ["admin", "médico", "enfermero"] },
    { name: "Indicadores",   icon: "heart-pulse",             path: "/Indicadores",   roles: ["admin", "médico", "enfermero"] },
    { name: "Evaluación",    icon: "clipboard-check-outline", path: "/Evaluacion",    roles: ["admin", "médico", "enfermero"] },
    { name: "Recetas",       icon: "pill",                    path: "/Recetas",       roles: ["admin", "médico"] },
    // { name: "Inventario",    icon: "package-variant-closed",  path: "/Inventario",    roles: ["admin", "médico"] },
    { name: "Documentos",    icon: "file-outline",            path: "/Documentos",    roles: ["admin", "médico", "enfermero", "usuario"] },
    { name: "Configuración", icon: "cog",                     path: "/Configuracion", roles: ["admin"] },
  ];

  const { user, logout } = useAuth() as { user: User; logout: () => void };

  // const userRol = (user?.puesto ?? "").toLowerCase().trim() as Rol;
  // const userRol = ((user?.puesto ?? "usuario").toLowerCase().trim() || "usuario") as Rol;
  const rolesValidos: Rol[] = ["admin", "médico", "enfermero", "usuario"];
  const puestoNorm = (user?.rol ?? "").toLowerCase().trim() as Rol;
  const userRol: Rol = rolesValidos.includes(puestoNorm) ? puestoNorm : "usuario";

  const esPrivilegiado = ROLES_PRIVILEGIADOS.includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  const itemsVisibles = menuItems.filter(item =>
    item.roles.includes(userRol)
  );
  
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/LoginToken");
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return "DR";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`bg-white/70 backdrop-blur-md border-r border-white/20 h-screen flex flex-col hidden md:flex fixed top-0 left-0 z-20 shadow-lg transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="h-16 flex items-center px-6 overflow-hidden whitespace-nowrap">

        {/* <i className="fa fa-star-of-life ml-0.5 text-2xl text-aqua-green mr-2 flex-shrink-0"></i> */}
        
        <div className="h-10 flex items-center mb-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={isCollapsed ? "icono" : "logo"}
              src={isCollapsed ? tngsanoIcono : tngsanoLogo}
              draggable={false}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-8 w-auto max-w-20 object-contain drop-shadow-2xl rounded-2xl"
            />
          </AnimatePresence>
        </div>
        {/* {!isCollapsed && (
          <span className="font-black text-primary italic tracking-tighter text-xl transition-opacity duration-300">
            Integrapp
          </span>
        )} */}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {itemsVisibles.map((item: MenuItem) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center px-3 py-1.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md shadow-blue-500/20"
                    : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <i
                    className={`mdi mdi-${item.icon} text-[20px] transition-all ${
                      isCollapsed ? "ml-1.5" : "ml-1.5"
                    } ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-sea-blue"
                    } mr-3`}
                  ></i>
                  {!isCollapsed && <span>{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 overflow-hidden">
        <NavLink
          to="/Perfil"
          onClick={(e) => {
            e.preventDefault();
          }}
          onAuxClick={(e) => {
            e.preventDefault();
          }}
          className={({ isActive }) => `group p-3 flex items-center w-full rounded-lg transition-all duration-200 disabled cursor-pointer ${isActive ? "bg-linear-to-r from-sea-blue to-sky-blue shadow-md shadow-blue-500/20" : "hover:bg-gray-100"}` }
        >
          {({ isActive }) => (
            <div className="flex items-center min-w-0 flex-1 overflow-hidden">
              <div className={`h-7.5 w-7.5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${isActive ? "text-sea-blue bg-white" : "text-white bg-linear-to-b from-sea-blue to-sky-blue"}`}>
                {getInitials(user?.nombre)}
              </div>
              <div className={`flex items-center flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible ml-3"}`}>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold uppercase truncate transition-colors ${isActive ? "text-white" : "text-gray-700"}`}
                    title={user?.nombre}
                  >
                    {user?.nombre || ""}
                  </p>
                  <p
                    className={`text-xs truncate transition-colors ${isActive ? "text-blue-100" : "text-gray-500 group-hover:text-gray-700"}`}
                    title={user?.puesto}
                  >
                    {user?.puesto || user.rol}
                  </p>
                </div>
              </div>
            </div>
          )}
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;