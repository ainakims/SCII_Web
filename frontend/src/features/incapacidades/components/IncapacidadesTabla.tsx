import React, { useEffect, useMemo, useState } from "react";
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from "lucide-react";

// Tabla propia de la sección Incapacidades: a diferencia de PacientesTabla
// (Pacientes.tsx/Reingresos.tsx) no muestra Especialidad ni Riesgo, agrega
// NSS/CURP y edad calculada, y no tiene columna de Acciones — toda la fila
// es la acción (abre el expediente de incapacidades al hacer clic).
export interface IncapacidadPacienteRow {
  IdPaciente?: number | null;
  Empl_matricula: string;
  Empl_Nombres: string;
  Categoria_desc?: string;
  Compania?: string;
  Especialidad?: string;
  NSS?: string;
  CURP?: string;
  FechaNacimiento?: string;
  Sexo?: "M" | "F" | string;
}

interface IncapacidadesTablaProps {
  pacientes: IncapacidadPacienteRow[];
  fillHeight?: boolean;
  // matrícula -> tiene una incapacidad activa en este momento.
  estatusActivo?: Record<string, boolean>;
  onSeleccionar: (paciente: IncapacidadPacienteRow) => void;
}

type SortCol = "matricula" | "nombre" | "edad" | "estatus" | null;
type SortDir = "asc" | "desc" | "none";

const ITEMS_POR_PAGINA = 100;

const calcularEdad = (fechaNacimiento: string | undefined): number | null => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const IncapacidadesTabla: React.FC<IncapacidadesTablaProps> = ({ pacientes, fillHeight = false, estatusActivo = {}, onSeleccionar }) => {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    if (sortDir === "desc") setSortCol(null);
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "fa-sort";
    return sortDir === "asc" ? "fa-sort-up" : "fa-sort-down";
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      `${p.Empl_Nombres} ${p.Empl_matricula} ${p.NSS ?? ""} ${p.CURP ?? ""}`.toLowerCase().includes(q)
    );
  }, [pacientes, busqueda]);

  const ordenados = useMemo(() => {
    if (!sortCol || sortDir === "none") return filtrados;
    const factor = sortDir === "asc" ? 1 : -1;
    const valor = (p: IncapacidadPacienteRow): string => {
      if (sortCol === "matricula") return p.Empl_matricula ?? "";
      if (sortCol === "nombre") return p.Empl_Nombres ?? "";
      if (sortCol === "edad") return String(calcularEdad(p.FechaNacimiento) ?? -1).padStart(3, "0");
      return estatusActivo[p.Empl_matricula] ? "1" : "0";
    };
    return [...filtrados].sort((a, b) => factor * valor(a).localeCompare(valor(b), "es", { numeric: true }));
  }, [filtrados, sortCol, sortDir, estatusActivo]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, sortCol, sortDir, pacientes]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const mostrados = useMemo(
    () => ordenados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA),
    [ordenados, indiceInicio]
  );

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, paginaSegura - 2);
    const end = Math.min(totalPaginas, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

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
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="text-gray-700 text-left">
              {encabezado("matricula", "Matrícula", "w-[110px]", "fa-brands fa-slack")}
              {encabezado("nombre", "Nombre", "", "fa-solid fa-user")}
              <th className="px-5 py-3 font-semibold w-[220px]">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-id-badge text-[10px] text-gray-400 mr-1"></i>
                  NSS / CURP
                </span>
              </th>
              {encabezado("edad", "Edad", "text-left w-[130px]", "fa-solid fa-calendar-week")}
              {encabezado("estatus", "Estado", "text-left w-[190px]", "fa-solid fa-circle-info")}
              <th className="w-14 pl-1 pr-3 py-3"></th>
            </tr>
            <tr className="bg-gray-50 text-left h-11">
              <td colSpan={5} className="px-5 py-2">
                <div className="relative w-94">
                  <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar nombre, matrícula, NSS o CURP"
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
              <td className="w-14 pl-1 pr-3 py-2"></td>
            </tr>
          </thead>
          <tbody>
            {mostrados.map((p, idx) => {
              const edad = calcularEdad(p.FechaNacimiento);
              const activa = Boolean(estatusActivo[p.Empl_matricula]);
              return (
                <tr
                  key={`${p.Empl_matricula}-${idx}`}
                  onClick={() => onSeleccionar(p)}
                  className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-0 font-bold tracking-wide text-gray-700 group-hover:text-sea-blue transition-colors">
                    {p.Empl_matricula && p.Empl_matricula !== "0" ? p.Empl_matricula : "EXT"}
                  </td>
                  <td className="px-5 py-0">
                    <p className="font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">{p.Empl_Nombres}</p>
                    <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">{p.Categoria_desc || p.Compania}</p>
                  </td>
                  <td className="px-5 py-0">
                    <p className="font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">{p.NSS || ""}</p>
                    <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">{p.CURP || ""}</p>
                  </td>
                  <td className="px-5 py-2 text-left text-gray-500 truncate group-hover:font-semibold transition-all">
                    {edad != null ? `${edad} años` : ""}
                  </td>
                  <td className="px-5 py-2 text-left font-bold text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <i className={`fa-solid ${activa ? "fa-circle-exclamation text-sunray-yellow" : "fa-circle-check text-aqua-green"} text-xs shrink-0`}></i>
                      {activa ? "Incapacitado" : "Disponible"}
                    </span>
                  </td>
                  <td className="w-14 pl-1 pr-3 py-2 text-right text-gray-400 group-hover:text-sea-blue transition-colors">
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
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
    </div>
  );
};

export default IncapacidadesTabla;
