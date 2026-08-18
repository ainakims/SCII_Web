import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from "lucide-react";
import OverlayTransicionAnalisis from "./shared/OverlayTransicionAnalisis";
import API_BASE_URL from "../../../config";
import { fetchWithAuth } from "../../../services/api";

export interface PacienteResumen {
  IdPaciente?: number | null;
  Empl_matricula: string;
  Empl_Nombres: string;
  Categoria_desc?: string;
  Compania?: string;
  Especialidad?: string;
  FechaConsulta?: string;
  Empl_fecha_baja?: string;
  Riesgo?: string;
  Empl_tipo_empleado?: string;
  Empl_tipo_contrato?: string;
  Sexo?: "M" | "F" | string;
  FechaNacimiento?: string;
}

export interface ValorColumnaClinica {
  texto: string;
  valor: number | null;
  // Fecha de la medición que dio origen al valor — se muestra en un tooltip
  // al pasar el mouse sobre la celda, para saber de cuándo es el dato.
  fecha: string | null;
}

// Columna adicional que solo aparece cuando se llega a esta tabla filtrada
// desde una gráfica del Dashboard (ver filtroClinico.ts) — nunca se muestra
// de otra forma. `label` es el encabezado (ej. "IMC", "ICT", "Glucosa") y
// `valores` trae el texto a mostrar + el valor numérico (para ordenar/filtrar)
// por matrícula.
export interface ColumnaClinica {
  label: string;
  valores: Record<string, ValorColumnaClinica>;
}

interface PacientesTablaProps {
  activo: boolean;
  pacientes: PacienteResumen[];
  fillHeight?: boolean;
  basePath?: string;
  showFecha?: boolean;
  onEdit?: (paciente: PacienteResumen) => void;
  onDelete?: (paciente: PacienteResumen) => void;
  onVerDocumentos?: (paciente: PacienteResumen) => void;
  columnaClinica?: ColumnaClinica;
}

type SortCol = "matricula" | "nombre" | "especialidad" | "fecha" | "riesgo" | "clinico" | null;
type SortDir = "asc" | "desc" | "none";

const ITEMS_POR_PAGINA = 100;

const ICONO_ESPECIALIDAD: Record<string, string> = {
  // "MECANICO": "wrench",
  // "BUZO": "water",
  // "CONFIANZA ADMINISTRATIVO": "building",
  // "CONFIANZA PRODUCCION": "industry",
  // "ELECTRICISTA": "bolt-lightning", /*bolt*/
  // "EXTERNO": "ship",
  // "LIMPIEZA (INTENDENCIA)": "broom",
};
const ICONO_ESPECIALIDAD_DEFAULT = "";

// Formatea la fecha del tooltip de la columna clínica (dd/mm/aaaa). Fecha
// llega tal cual vino de RegistroValidado.Fecha.original — puede traer hora
// (ISO con "T"), por eso se parsea con Date en vez de solo cortar el string.
const fmtFechaClinica = (fecha: string | null): string => {
  if (!fecha) return "Sin fecha registrada";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "Sin fecha registrada";
  return `Medición: ${d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

const ICONO_RIESGO: Record<string, { icon: string; color: string }> = {
  BAJO: { icon: "circle-check", color: "text-aqua-green" },
  MEDIO: { icon: "circle-exclamation", color: "text-sunray-yellow" },
  ALTO: { icon: "triangle-exclamation", color: "text-red-500" },
};

const PacientesTabla: React.FC<PacientesTablaProps> = ({ activo, pacientes, fillHeight = false, basePath = "/Pacientes", showFecha = true, onEdit, onDelete, onVerDocumentos, columnaClinica }) => {
  const navigate = useNavigate();
  const [navegandoAMatricula, setNavegandoAMatricula] = useState<string | null>(null);
  const irAAnalisis = async (p: PacienteResumen) => {
    const matricula = String(p.Empl_matricula ?? "").trim();
    setNavegandoAMatricula(matricula);

    let resultadoPrecargado: unknown = null;
    try {
      const endpoint = activo ? "Evaluar" : "EvaluarInactivos";
      const res = await fetchWithAuth(`${API_BASE_URL}/AnalisisIndividual/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ matricula }),
      });
      const json = await res.json();
      if (json?.ok) resultadoPrecargado = json.data;
    } catch (err) {
      console.error("Error al pre-cargar análisis individual:", err);
    }

    navigate(`${basePath}/${encodeURIComponent(matricula)}`, { state: { nombre: p.Empl_Nombres, activo, resultadoPrecargado } });
  };
  const [busqueda, setBusqueda] = useState("");
  const [showFiltros, setShowFiltros] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [filtroTipoEmpleado, setFiltroTipoEmpleado] = useState("");
  const [filtroTipoContrato, setFiltroTipoContrato] = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");

  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  // Al llegar filtrado desde una gráfica del Dashboard, lo más útil es ver de
  // entrada quién tiene el valor más alto (ej. el peso más alto dentro de
  // "Sobrepeso"), no el orden en que vino del backend. Se dispara con
  // columnaClinica?.label (no con el objeto completo) para no resetear el
  // orden si el usuario ya lo cambió a mano y el componente vuelve a
  // renderizar con la misma columna activa.
  useEffect(() => {
    if (columnaClinica) {
      setSortCol("clinico");
      setSortDir("desc");
    }
  }, [columnaClinica?.label]);

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    if (sortDir === "desc") setSortCol(null);
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "fa-sort";
    return sortDir === "asc" ? "fa-sort-up" : "fa-sort-down";
  };

  const hayAcciones = Boolean(onEdit || onDelete || onVerDocumentos);
  const hayFiltrosActivos = Boolean(busqueda || filtroTipoEmpleado || filtroTipoContrato || filtroSexo);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pacientes.filter((p) => {
      if (q && !`${p.Empl_Nombres} ${p.Empl_matricula}`.toLowerCase().includes(q)) return false;
      if (filtroTipoEmpleado && p.Empl_tipo_empleado !== filtroTipoEmpleado) return false;
      if (filtroTipoContrato && p.Empl_tipo_contrato !== filtroTipoContrato) return false;
      if (filtroSexo && p.Sexo !== filtroSexo) return false;
      return true;
    });
  }, [pacientes, busqueda, filtroTipoEmpleado, filtroTipoContrato, filtroSexo]);

  const ordenados = useMemo(() => {
    if (!sortCol || sortDir === "none") return filtrados;
    const factor = sortDir === "asc" ? 1 : -1;
    const valor = (p: PacienteResumen): string => {
      if (sortCol === "matricula") return p.Empl_matricula ?? "";
      if (sortCol === "nombre") return p.Empl_Nombres ?? "";
      if (sortCol === "especialidad") return p.Especialidad ?? "";
      if (sortCol === "fecha") return (activo ? p.FechaConsulta : p.Empl_fecha_baja) ?? "";
      if (sortCol === "clinico") return String(columnaClinica?.valores[p.Empl_matricula]?.valor ?? "");
      return p.Riesgo ?? "";
    };
    return [...filtrados].sort((a, b) => factor * valor(a).localeCompare(valor(b), "es", { numeric: true }));
  }, [filtrados, sortCol, sortDir, activo, columnaClinica]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroTipoEmpleado, filtroTipoContrato, filtroSexo, sortCol, sortDir, activo]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const mostrados = useMemo(
    () => ordenados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA),
    [ordenados, indiceInicio]
  );

  // Mismo criterio que getPageNumbers() en Pacientes.tsx: ventana de 3
  // números centrada en la página actual, con "…" en los extremos si falta.
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, paginaSegura - 2);
    const end = Math.min(totalPaginas, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // icon: nombre del ícono de Font Awesome (sin el prefijo "fa-solid fa-"),
  // ej. "id-card". Se deja vacío a propósito — cada encabezado se rellena a
  // mano según se decida qué ícono le toca a cada columna.
  const encabezado = (col: SortCol, label: string, extraCls: string, icon: string = "") => (
    <th onClick={() => cycleSort(col)} className={`px-5 py-3 font-semibold cursor-pointer select-none group ${extraCls}`}>
      <span className={`flex items-center gap-1 ${extraCls.includes("text-right") ? "justify-end" : extraCls.includes("text-center") ? "justify-center" : ""}`}>
        {icon && <i className={`${icon} text-[10px] text-gray-400 group-hover:text-gray-500 mr-1`}></i>}
        {label}
        <i className={`fa-solid ${sortIcon(col)} text-[10px] transition-colors ${sortCol === col && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
      </span>
    </th>
  );

  return (
    <div className={fillHeight ? "flex flex-col h-full min-h-0 bg-white rounded-lg shadow-xs pb-0" : ""}>
      <div className={fillHeight ? "flex-1 min-h-0 overflow-auto rounded-lg" : "h-[420px] overflow-auto rounded-lg"}>
        {/* shadow-xl */}
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="text-gray-700 text-left">
              {encabezado("matricula", "Matrícula", "w-[110px]", "fa-brands fa-slack")}
              {encabezado("nombre", "Nombre", "", "fa-solid fa-user")}
              {encabezado("especialidad", "Especialidad", "w-[170px]", "fa-solid fa-screwdriver-wrench")}
              {showFecha && encabezado("fecha", activo ? "Última Consulta" : "Fecha Baja", "text-left w-[170px]", "fa-solid fa-calendar-week")}
              {encabezado("riesgo", "Riesgo", "text-left w-[170px]", "fa-solid fa-radiation")}
              {columnaClinica && encabezado("clinico", columnaClinica.label, "text-left w-[170px]", "fa-solid fa-vial")}
              {hayAcciones && (
                <th className="px-5 py-3 text-center font-semibold text-gray-700 w-[170px]"><i className="fa-solid fa-arrow-pointer text-xs text-gray-400 group-hover:text-gray-500 mr-1"></i>Acciones</th>
              )}
              <th className="w-8 pl-1 pr-3 py-3 text-center">
                <i
                  onClick={(e) => { e.stopPropagation(); setShowFiltros((v) => !v); }}
                  title={showFiltros ? "Ocultar filtros" : "Mostrar filtros"}
                  className={`fa-solid ${showFiltros ? "fa-filter-circle-xmark" : "fa-filter"} cursor-pointer text-xs transition-colors ${showFiltros || hayFiltrosActivos ? "text-sea-blue" : "text-gray-300 hover:text-gray-400"}`}
                ></i>
              </th>
            </tr>
            {showFiltros && (
              <tr className="bg-gray-50 text-left h-11">
                <td colSpan={2} className="px-5 py-2">
                  <div className="relative w-94">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar nombre o matrícula"
                      className="w-full h-7 pl-8 pr-7 py-1 rounded-md text-xs shadow-xs bg-white outline-none focus:ring-1 focus:ring-sea-blue"
                    />
                    {busqueda && (
                      <button
                        type="button"
                        onClick={() => setBusqueda("")}
                        title="Limpiar"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-circle-xmark text-xs"></i>
                      </button>
                    )}
                  </div>
                </td>

                {activo ? (
                  <>
                    {showFecha ? (
                      <>
                        <td className="pl-5 pr-1 py-2 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Género 2</span>
                            <select
                              value={filtroSexo}
                              onChange={(e) => setFiltroSexo(e.target.value)}
                              className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                            >
                              <option value="">Todos</option>
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-left">
                          <div className="flex items-center justify-start gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Tipo</span>
                            <select
                              value={filtroTipoEmpleado}
                              onChange={(e) => setFiltroTipoEmpleado(e.target.value)}
                              className="text-xs h-7 border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                            >
                              <option value="">Todos</option>
                              <option value="C">Confianza</option>
                              <option value="O">Sindicalizado</option>
                              <option value="EX">Externo</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-right">
                          {/* colSpan={2} */}
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Contrato</span>
                            <select
                              value={filtroTipoContrato}
                              onChange={(e) => setFiltroTipoContrato(e.target.value)}
                              className="text-xs h-7 border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                            >
                              <option value="">Todos</option>
                              <option value="E">Eventual</option>
                              <option value="P">Planta</option>
                              <option value="C">Por contrato</option>
                              <option value="EX">Subcontrato</option>
                            </select>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Tipo</span>
                            <select
                              value={filtroTipoEmpleado}
                              onChange={(e) => setFiltroTipoEmpleado(e.target.value)}
                              className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                            >
                              <option value="">Todos</option>
                              <option value="C">Confianza</option>
                              <option value="O">Sindicalizado</option>
                              <option value="EX">Externo</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-500">Contrato</span>
                            <select
                              value={filtroTipoContrato}
                              onChange={(e) => setFiltroTipoContrato(e.target.value)}
                              className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                            >
                              <option value="">Todos</option>
                              <option value="E">Eventual</option>
                              <option value="P">Planta</option>
                              <option value="C">Por contrato</option>
                              <option value="EX">Subcontrato</option>
                            </select>
                          </div>
                        </td>
                      </>
                    )}
                  </>
                ) : (
                  <td colSpan={showFecha ? 3 : 2} className="px-5 py-2"></td>
                )}

                {columnaClinica && <td className="px-5 py-2"></td>}

                {!showFecha && activo && hayAcciones ? (
                  <>
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Género</span>
                        <select
                          value={filtroSexo}
                          onChange={(e) => setFiltroSexo(e.target.value)}
                          className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                        >
                          <option value="">Todos</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </div>
                    </td>
                    <td className="w-8 pl-1 pr-3 py-2"></td>
                  </>
                ) : (
                  <>
                    <td className="w-8 pl-1 pr-3 py-2"></td>
                    {hayAcciones && <td className="px-5 py-2"></td>}
                  </>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {mostrados.map((p, idx) => {
              const fecha = activo ? p.FechaConsulta : p.Empl_fecha_baja;
              return (
                <tr
                  key={`${p.Empl_matricula}-${idx}`}
                  onClick={() => irAAnalisis(p)}
                  className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-0 font-bold tracking-wide text-gray-700 group-hover:text-sea-blue transition-colors">{p.Empl_matricula && p.Empl_matricula !== "0" ? p.Empl_matricula : "EXT"}</td>
                  <td className="px-5 py-0">
                    <p className="font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">{p.Empl_Nombres}</p>
                    <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">{p.Categoria_desc || p.Compania}</p>
                  </td>
                  <td className="px-5 py-2 text-gray-500 truncate group-hover:font-semibold transition-all">
                    {(() => {
                      const icono = ICONO_ESPECIALIDAD[p.Especialidad ?? ""] ?? ICONO_ESPECIALIDAD_DEFAULT;
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          {icono && <i className={`mdi mdi-${icono} text-gray-400 text-[11px]`}></i>}
                          {p.Especialidad}
                        </span>
                      );
                    })()}
                  </td>
                  {showFecha && (
                    <td className="px-5 py-2 text-left text-gray-500 group-hover:font-semibold transition-all">
                      {fecha ? (
                        activo ? (
                          new Date(fecha).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
                        ) : (
                          // Día/mes/año en columnas de ancho fijo para que las
                          // "/" queden alineadas entre filas, sin depender de
                          // ninguna variante de fuente (tabular-nums, etc.).
                          (() => {
                            const d = new Date(fecha);
                            const dd = String(d.getDate()).padStart(2, "0");
                            const mm = String(d.getMonth() + 1).padStart(2, "0");
                            const yyyy = String(d.getFullYear());
                            return (
                              <span className="inline-flex">
                                <span className="w-4.5 text-center">{dd}</span>
                                <span className="w-1.5 text-center">·</span>
                                <span className="w-4.5 text-center">{mm}</span>
                                <span className="w-1.5 text-center">·</span>
                                <span className="w-9 text-center">{yyyy}</span>
                              </span>
                            );
                          })()
                        )
                      ) : ""}
                    </td>
                  )}
                  <td className="px-5 py-2 text-left font-bold text-gray-700">
                    {p.Riesgo && (() => {
                      const { icon, color } = ICONO_RIESGO[p.Riesgo.trim().toUpperCase()] ?? { icon: "circle", color: "text-gray-300" };
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          <i className={`fa-solid fa-${icon} ${color} text-xs shrink-0`}></i>
                          {p.Riesgo}
                        </span>
                      );
                    })()}
                  </td>
                  {columnaClinica && (() => {
                    const dato = columnaClinica.valores[p.Empl_matricula];
                    return (
                      <td className="px-5 py-2 text-left text-gray-700 font-semibold">
                        {dato ? (
                          <span className="relative inline-flex items-center gap-1 group/clinico cursor-help max-w-full">
                            <span className="truncate">{dato.texto}</span>
                            <i className="fa-solid fa-clock text-[10px] text-gray-300 group-hover/clinico:text-sea-blue transition-colors shrink-0"></i>
                            <span className="absolute left-0 bottom-full mb-1.5 hidden group-hover/clinico:block z-50 whitespace-nowrap">
                              <span className="block bg-gray-800 text-white text-[10px] rounded-md px-2 py-1.5 shadow-lg leading-tight">
                                {fmtFechaClinica(dato.fecha)}
                              </span>
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                    );
                  })()}
                  {hayAcciones && (
                    <td className="px-2 pr-0 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-center">
                        {p.Empl_matricula && Number(p.Empl_matricula) > 0 && p.IdPaciente == null ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(p); }}
                            className="w-6 text-gray-400 hover:text-sky-blue transition-all cursor-pointer"
                            title="Registrar"
                          >
                            <i className="fa-solid fa-user-plus text-xs"></i>
                          </button>
                        ) : (
                          onEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                              className="w-6 text-gray-400 hover:text-sky-blue transition-all cursor-pointer"
                              title="Editar"
                            >
                              <i className="fa-solid fa-pencil text-xs"></i>
                            </button>
                          )
                        )}
                        {p.Empl_matricula && Number(p.Empl_matricula) === 0 ? (
                          onDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(p); }}
                              className="w-6 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash-arrow-up text-xs"></i>
                            </button>
                          )
                        ) : (
                          onVerDocumentos && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onVerDocumentos(p); }}
                              className="w-6 text-gray-400 hover:text-sky-blue transition-all cursor-pointer"
                              title="Documentación"
                            >
                              <i className="fa-regular fa-file text-xs"></i>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                  <td className="w-8 pl-1 pr-3 py-2 text-right text-gray-400 group-hover:text-sea-blue transition-colors">
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </td>
                </tr>
              );
            })}
            {mostrados.length === 0 && (
              <tr>
                <td colSpan={(hayAcciones ? 7 : 5) + (showFecha ? 1 : 0) + (columnaClinica ? 1 : 0)} className="text-center text-gray-400 text-xs py-8">Sin coincidencias.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      

      <div className="grid grid-cols-2 gap-4 items-center px-5 py-3 shrink-0">
        <div className="col-span-1 flex items-center">
          <span className="text-xs font-bold text-gray-400">
            {paginaSegura} de {totalPaginas} páginas · {ordenados.length.toLocaleString("es-MX")} resultados
          </span>
        </div>
        <div className="col-span-1 flex justify-end">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(1)}
              disabled={paginaSegura === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Primera página"
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              title="Anterior"
              onClick={() => setPagina((p) => Math.max(p - 1, 1))}
              disabled={paginaSegura === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex gap-1 items-center">
              {getPageNumbers()[0] > 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
              {getPageNumbers().map((page) => (
                <button
                  title={`Pág. ${page}`}
                  key={page}
                  onClick={() => setPagina(page)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs cursor-pointer shadow-xs font-semibold transition-all ${paginaSegura === page ? "text-white bg-linear-to-b from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80" : "hover:bg-gray-100"}`}
                >
                  {page}
                </button>
              ))}
              {getPageNumbers()[getPageNumbers().length - 1] < totalPaginas && (
                <span className="text-slate-400 px-1 text-xs">...</span>
              )}
            </div>

            <button
              title="Siguiente"
              onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
              disabled={paginaSegura === totalPaginas}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPagina(totalPaginas)}
              disabled={paginaSegura === totalPaginas}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Última página"
            >
              <ChevronLast className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {navegandoAMatricula && <OverlayTransicionAnalisis />}
    </div>
  );
};

export default PacientesTabla;
