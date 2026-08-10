import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from "lucide-react";

export interface PacienteResumen {
  Empl_matricula: string;
  Empl_Nombres: string;
  Categoria_desc?: string;
  Compania?: string;
  Especialidad?: string;
  FechaConsulta?: string;
  Empl_fecha_baja?: string;
  Riesgo?: string;
  // Solo se usan/muestran en "Personal activo" (ver filtros más abajo); el
  // mismo endpoint de Pacientes.tsx ya los regresa.
  Empl_tipo_empleado?: string;
  Empl_tipo_contrato?: string;
  Sexo?: string;
}

interface PacientesTablaProps {
  activo: boolean;
  pacientes: PacienteResumen[];
}

type SortCol = "matricula" | "nombre" | "especialidad" | "fecha" | "riesgo" | null;
type SortDir = "asc" | "desc" | "none";

const ITEMS_POR_PAGINA = 100;

// Tabla de pacientes activos / con reingreso, mismo formato de columnas que el
// directorio de Pacientes (frontend/src/pages/Pacientes.tsx), con el mismo
// "look & feel" que DepartamentoTabla.tsx (altura fija con scroll interno,
// encabezado sticky, columnas ordenables). Es puramente presentacional: el
// fetch y el loading compartido con Departamentos viven en Expediente.tsx,
// para que los tres directorios carguen juntos y no se repita la petición al
// cambiar de tab.
//
// SOLO en "Personal activo" (activo=true) el panel de filtros y el pie de
// paginación copian exactamente los de Pacientes.tsx (Tipo de
// empleado/contrato/Sexo + paginado numerado con elipsis); Reingresos se
// queda con la versión simple (búsqueda + primera/anterior/siguiente/última).
const PacientesTabla: React.FC<PacientesTablaProps> = ({ activo, pacientes }) => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [showFiltros, setShowFiltros] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [filtroTipoEmpleado, setFiltroTipoEmpleado] = useState("");
  const [filtroTipoContrato, setFiltroTipoContrato] = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");

  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    if (sortDir === "desc") setSortCol(null);
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "mdi-sort";
    return sortDir === "asc" ? "mdi-sort-ascending" : "mdi-sort-descending";
  };

  // filtroTipoEmpleado/Contrato/Sexo solo se pueden fijar desde los selects
  // que se muestran cuando activo=true; en Reingresos siempre quedan en "",
  // así que esta misma lógica de filtrado no le cambia nada a esa pestaña.
  const hayFiltrosActivos = Boolean(busqueda || filtroTipoEmpleado || filtroTipoContrato || filtroSexo);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipoEmpleado("");
    setFiltroTipoContrato("");
    setFiltroSexo("");
  };

  // La búsqueda y los filtros operan sobre TODOS los pacientes recibidos (no
  // solo la página visible), así que siempre encuentran coincidencias en toda
  // la base, no nada más en el lote que se está mostrando.
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
      return p.Riesgo ?? "";
    };
    return [...filtrados].sort((a, b) => factor * valor(a).localeCompare(valor(b), "es", { numeric: true }));
  }, [filtrados, sortCol, sortDir, activo]);

  // Reinicia a la página 1 cuando cambia la búsqueda, algún filtro, el orden
  // o el tab (activos/reingresos) — evita quedar "varado" en una página vacía.
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

  const encabezado = (col: SortCol, label: string, extraCls: string) => (
    <th onClick={() => cycleSort(col)} className={`px-5 py-3 font-semibold cursor-pointer select-none group ${extraCls}`}>
      <span className={`flex items-center gap-1 ${extraCls.includes("text-right") ? "justify-end" : extraCls.includes("text-center") ? "justify-center" : ""}`}>
        {label}
        <i className={`mdi ${sortIcon(col)} text-sm transition-colors ${sortCol === col && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
      </span>
    </th>
  );

  return (
    <div>
      {/* Alto FIJO (no max-h): la caja siempre mide lo mismo sin importar
          cuántas filas traiga la página actual — solo cuando hay más de ~10
          aparece scroll interno, en vez de que la tabla crezca/encoja. */}
      <div className="h-[420px] overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 z-10 bg-linear-to-r from-white to-gray-100">
            <tr className="text-gray-700 text-left">
              {encabezado("matricula", "Matrícula", "w-[90px]")}
              {encabezado("nombre", "Nombre", "")}
              {encabezado("especialidad", "Especialidad", "w-[210px]")}
              {encabezado("fecha", activo ? "Última consulta" : "Fecha de baja", "text-left w-[170px]")}
              {encabezado("riesgo", "Riesgo", "text-left w-[210px]")}
              <th className="w-8 pl-1 pr-3 py-3 text-center">
                <i
                  onClick={(e) => { e.stopPropagation(); setShowFiltros((v) => !v); }}
                  title={showFiltros ? "Ocultar filtros" : "Mostrar filtros"}
                  className={`mdi ${showFiltros ? "mdi-filter-off" : "mdi-filter"} cursor-pointer text-xs transition-colors ${showFiltros || hayFiltrosActivos ? "text-sea-blue" : "text-gray-300 hover:text-gray-400"}`}
                ></i>
              </th>
            </tr>
            {showFiltros && (
              <tr className="bg-linear-to-r from-white to-gray-100 text-left">
                <td colSpan={2} className="px-5 py-2">
                  <div className="relative max-w-[260px]">
                    <i className="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar nombre o matrícula"
                      className="w-94 pl-8 pr-2 py-1 rounded-md text-xs border border-gray-200 bg-white outline-none focus:ring-1 focus:ring-sea-blue"
                    />
                  </div>
                </td>

                {activo ? (
                  <>
                  <td className="pl-5 pr-1 py-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Género</span>
                        <select
                          value={filtroSexo}
                          onChange={(e) => setFiltroSexo(e.target.value)}
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
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
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                        >
                          <option value="">Todos</option>
                          <option value="C">Confianza</option>
                          <option value="O">Sindicalizado</option>
                          <option value="EX">Externo</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Contrato</span>
                        <select
                          value={filtroTipoContrato}
                          onChange={(e) => setFiltroTipoContrato(e.target.value)}
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
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
                    <td className="px-5 py-2"></td>
                    <td className="px-5 py-2"></td>
                    <td className="px-5 py-2"></td>
                  </>
                )}

                <td className="w-8 pl-1 pr-3 py-2 text-center">
                  {/* Mismo ancho fijo que el ícono de embudo del encabezado:
                      queda justo debajo, y solo cambia visible/invisible. */}
                  <button
                    onClick={limpiarFiltros}
                    disabled={!hayFiltrosActivos}
                    className={`text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer ${hayFiltrosActivos ? "" : "invisible pointer-events-none"}`}
                  >
                    <i className="mdi mdi-close-circle"></i>
                  </button>
                </td>
              </tr>
            )}
          </thead>
          <tbody>
            {mostrados.map((p, idx) => {
              const fecha = activo ? p.FechaConsulta : p.Empl_fecha_baja;
              return (
                <tr
                  key={`${p.Empl_matricula}-${idx}`}
                  onClick={() => navigate(`/Expediente/${encodeURIComponent(String(p.Empl_matricula ?? ""))}`, { state: { nombre: p.Empl_Nombres } })}
                  className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-0 font-semibold text-gray-700">{p.Empl_matricula && p.Empl_matricula !== "0" ? p.Empl_matricula : "EXT"}</td>
                  <td className="px-5 py-0">
                    <p className="font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">{p.Empl_Nombres}</p>
                    <p className="text-[10px] text-gray-400 uppercase truncate">{p.Categoria_desc || p.Compania}</p>
                  </td>
                  <td className="px-5 py-2 text-gray-500 truncate">{p.Especialidad}</td>
                  {/* <td className="px-5 py-2 text-left text-gray-500">{fecha ? new Date(fecha).toLocaleDateString("es-MX") : ""}</td> */}
                  <td className="px-5 py-2 text-left text-gray-500">
                    {fecha ? new Date(fecha).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, }): ""}
                  </td>
                  <td className="px-5 py-2 text-right text-gray-500">{p.Riesgo || ""}</td>
                  <td className="w-8 pl-1 pr-3 py-2 text-right text-gray-400 group-hover:text-sea-blue transition-colors">
                    <i className="mdi mdi-chevron-right"></i>
                  </td>
                </tr>
              );
            })}
            {mostrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 text-xs py-8">Sin coincidencias.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activo ? (
        <div className="grid grid-cols-2 gap-4 items-center mt-2 h-5 overflow-visible">
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
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs border cursor-pointer border-gray-100 shadow-md font-semibold transition-all ${paginaSegura === page ? "text-white bg-linear-to-b from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80" : "hover:bg-gray-100"}`}
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
      ) : (
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-gray-400">
            {ordenados.length.toLocaleString("es-MX")} paciente(s)
            {totalPaginas > 1 && ` · página ${paginaSegura} de ${totalPaginas}`}
          </p>

          {totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(1)}
                disabled={paginaSegura === 1}
                className="p-1.5 rounded-md bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white shadow-md shadow-blue-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Primera página"
              >
                <i className="mdi mdi-page-first"></i>
              </button>
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaSegura === 1}
                className="p-1.5 rounded-md bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white shadow-md shadow-blue-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Anterior"
              >
                <i className="mdi mdi-chevron-left"></i>
              </button>
              <span className="text-[10px] text-gray-500 px-1">{paginaSegura} / {totalPaginas}</span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura === totalPaginas}
                className="p-1.5 rounded-md bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white shadow-md shadow-blue-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Siguiente"
              >
                <i className="mdi mdi-chevron-right"></i>
              </button>
              <button
                onClick={() => setPagina(totalPaginas)}
                disabled={paginaSegura === totalPaginas}
                className="p-1.5 rounded-md bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white shadow-md shadow-blue-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Última página"
              >
                <i className="mdi mdi-page-last"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PacientesTabla;
