import React, { FC, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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

type Rol = "admin" | "médico" | "usuario";

interface MenuItem {
  name: string;
  icon: string;
  path: string;
  roles: Rol[];
}

interface MenuGroup {
  name: string;
  icon: string;
  roles: Rol[];
  children: MenuItem[];
}

type MenuEntry =
  | ({ type: "item" } & MenuItem)
  | ({ type: "group" } & MenuGroup);

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
  const menuEntries: MenuEntry[] = [
    // { name: "Dashboard",     icon: "view-dashboard",          path: "/Dashboard",     roles: ["admin", "médico"] }, //compass
    { type: "item", name: "Dashboard", icon: "compass", path: "/Dashboard", roles: ["admin", "médico"] },
    { type: "item", name: "Dashboard", icon: "compass", path: "/Dashboard/Usuario", roles: ["usuario"] },
    {
      type: "group",
      name: "Personal",
      icon: "address-book",
      roles: ["admin", "médico"],
      children: [
        { name: "Pacientes",   icon: "user-group",       path: "/Pacientes",   roles: ["admin", "médico"] },
        { name: "Reingresos",  icon: "arrows-spin",      path: "/Reingresos",  roles: ["admin", "médico"] },
        { name: "Incapacidad", icon: "wheelchair-move",  path: "/Incapacidad", roles: ["admin", "médico"] },
      ],
    },
    { type: "item", name: "Agenda", icon: "calendar-week", path: "/Agenda", roles: ["admin", "médico", "usuario"] },
    {
      type: "group",
      name: "Expediente",
      icon: "folder",
      roles: ["admin", "médico", "usuario"],
      children: [
        { name: "Evaluación", icon: "clipboard-list",       path: "/Evaluacion", roles: ["admin", "médico"] },
        { name: "Consultas",  icon: "truck-medical",   path: "/Consultas",  roles: ["admin", "médico"] },
        { name: "Documentos", icon: "file",             path: "/Documentos", roles: ["admin", "médico", "usuario"] },
      ],
    },
    { type: "item", name: "Indicadores", icon: "heart-pulse", path: "/Indicadores", roles: ["admin", "médico"] },
    // { name: "Salud Poblacional", icon: "chart-box-outline", path: "/SaludPoblacional", roles: ["admin", "médico"] },
    // { name: "Inventario", icon: "package-variant-closed", path: "/Inventario", roles: ["admin", "médico"] },
    { type: "item", name: "Configuración", icon: "cog", path: "/Configuracion", roles: ["admin"] },
  ];

  const { user, logout } = useAuth() as { user: User; logout: () => void };

  // const userRol = (user?.puesto ?? "").toLowerCase().trim() as Rol;
  // const userRol = ((user?.puesto ?? "usuario").toLowerCase().trim() || "usuario") as Rol;
  const rolesValidos: Rol[] = ["admin", "médico", "usuario"];
  const puestoNorm = (user?.rol ?? "").toLowerCase().trim() as Rol;
  const userRol: Rol = rolesValidos.includes(puestoNorm) ? puestoNorm : "usuario";

  const esPrivilegiado = ROLES_PRIVILEGIADOS.includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  const entriesVisibles = menuEntries
    .filter(entry => entry.roles.includes(userRol))
    .map(entry =>
      entry.type === "group"
        ? { ...entry, children: entry.children.filter(child => child.roles.includes(userRol)) }
        : entry
    )
    .filter(entry => entry.type !== "group" || entry.children.length > 0);

  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(
      menuEntries
        .filter(entry => entry.type === "group")
        .map(entry => [entry.name, true])
    )
  );

  const toggleGroup = (name: string): void => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

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
      id="app-sidebar"
      className={`bg-white backdrop-blur-md shadow-[2px_0_3px_-2px_rgba(0,0,0,0.08)] h-screen flex flex-col hidden md:flex fixed top-0 left-0 z-50 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="h-16 flex items-center px-6 overflow-hidden whitespace-nowrap shadow-[3px_0_5px_-1px_rgba(0,0,0,0.15)]">

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
          {entriesVisibles.map((entry) => {
            if (isCollapsed && entry.type === "group") {
              return entry.children.map((child) => (
                <NavLink
                  key={child.name}
                  to={child.path}
                  title={child.name}
                  className={({ isActive }) =>
                    `group flex items-center justify-center px-0 py-1.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md shadow-blue-500/20"
                        : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <i
                      className={`fa-solid fa-${child.icon} text-sm transition-all ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-sea-blue"
                      }`}
                    ></i>
                  )}
                </NavLink>
              ));
            }

            if (entry.type === "item") {
              return (
                <NavLink
                  key={entry.name}
                  to={entry.path}
                  className={({ isActive }) =>
                    `group flex items-center py-1.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isCollapsed ? "justify-center px-0" : "px-3"
                    } ${
                      isActive
                        ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md shadow-blue-500/20"
                        : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <i
                        className={`fa-solid fa-${entry.icon} text-sm transition-all ${
                          isCollapsed ? "" : "ml-1.5 mr-3"
                        } ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-sea-blue"
                        }`}
                      ></i>
                      {!isCollapsed && <span>{entry.name}</span>}
                    </>
                  )}
                </NavLink>
              );
            }

            const isGroupActive = entry.children.some(child => location.pathname.startsWith(child.path));
            const isOpen = openGroups[entry.name] ?? true;

            return (
              <div key={entry.name} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.name)}
                  className={`group w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isGroupActive
                      ? "text-sea-blue bg-gray-100"
                      : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
                  }`}
                >
                  <i
                    className={`fa-solid fa-${entry.icon} text-sm transition-all ml-1.5 mr-3 ${
                      isGroupActive ? "text-sea-blue" : "text-slate-400 group-hover:text-sea-blue"
                    }`}
                  ></i>
                  <span className="flex-1 text-left">{entry.name}</span>
                  <i
                    className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  ></i>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="my-1 py-1.5 ml-6 pl-4 space-y-1 border-l-2 border-gray-200">
                        {entry.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.path}
                            className={({ isActive }) =>
                              `group flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isActive
                                  ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md shadow-blue-500/20"
                                  : "text-gray-500 hover:text-sea-blue hover:bg-gray-100"
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <i
                                  className={`fa-solid fa-${child.icon} text-sm transition-all ${
                                    isActive
                                      ? "text-white"
                                      : "text-slate-400 group-hover:text-sea-blue"
                                  } mr-3`}
                                ></i>
                                <span>{child.name}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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