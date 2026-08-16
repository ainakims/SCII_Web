import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DepartamentoResumen, Tendencia } from "../resumenMedicoIA";

interface DepartamentoTablaProps {
  departamentos: DepartamentoResumen[];
  onSeleccionar: (nombre: string) => void;
}

// Tooltip propio (mismo patrón que el aviso de CURP duplicado en Pacientes.tsx:
// burbuja oscura + triángulo, revelada con group-hover) en vez del title nativo
// del navegador, que se ve inconsistente y tarda en aparecer.
const Tooltip: React.FC<{ texto: React.ReactNode; children: React.ReactNode; sinLimiteAncho?: boolean; ocuparAncho?: boolean }> = ({ texto, children, sinLimiteAncho, ocuparAncho }) => (
  <div className={`relative items-center group/tooltip ${ocuparAncho ? "flex w-full" : "inline-flex"}`}>
    {children}
    <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tooltip:block z-20 w-max ${sinLimiteAncho ? "" : "max-w-[220px]"}`}>
      <div className={`bg-white text-gray-700 text-[10px] rounded-md px-2 py-1.5 shadow-md leading-snug text-center ${sinLimiteAncho ? "whitespace-nowrap" : "whitespace-normal"}`}>
        {texto}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white"></div>
    </div>
  </div>
);

// Solo se llaman cuando ya se confirmó que hay tendencia (ver uso más abajo);
// sin tendencia confiable no se muestra ícono ni tooltip, así que no hay un
// caso "sin dato" que manejar aquí.
function textoTendencia(tendencia: Tendencia): React.ReactNode {
  if (tendencia.direccion === "alza") return <>Tendencia al alza: <strong>+{tendencia.cambioPct}%</strong></>;
  if (tendencia.direccion === "baja") return <>Tendencia a la baja: <strong>{tendencia.cambioPct}%</strong></>;
  return <>Tendencia estable: <strong>{tendencia.cambioPct}%</strong></>;
}

const IconoTendencia: React.FC<{ tendencia: Tendencia }> = ({ tendencia }) => {
  if (tendencia.direccion === "alza") return <i className="mdi mdi-trending-up text-[#EE7523]"></i>;
  if (tendencia.direccion === "baja") return <i className="mdi mdi-trending-down text-[#54BBAB]"></i>;
  return <i className="mdi mdi-trending-neutral text-gray-400"></i>;
};

const fmt = (v: number | null, unidad = "") => (v != null ? `${v}${unidad}` : "s/d");

// Igual que el bloque "Clasificación IMC" de las cards de "Resumen médico (IA)
// — prototipo" (DepartamentoCard.tsx), pero reducido a 3 colores de riesgo en
// vez de las 4 categorías OMS: verde (bajo peso + normopeso, sin riesgo por
// exceso de peso), amarillo (sobrepeso) y rojo (obesidad). Solo se dibujan los
// segmentos con personas, por eso la barra puede tener de 1 a 3 tramos.
function segmentosClasificacionImc(d: DepartamentoResumen): { color: string; pct: number }[] {
  const { bajoPeso, normopeso, sobrepeso, obesidad } = d.distribucionImc;
  const verde = bajoPeso + normopeso;
  const amarillo = sobrepeso;
  const rojo = obesidad;
  const total = verde + amarillo + rojo;
  if (total === 0) return [];

  return [
    { color: "#54BBAB", valor: verde },
    { color: "#FFC627", valor: amarillo },
    { color: "#EE7523", valor: rojo },
  ]
    .filter((s) => s.valor > 0)
    .map((s) => ({ color: s.color, pct: (s.valor / total) * 100 }));
}

// Mismos colores que segmentosClasificacionImc, para que el tooltip identifique
// cada cifra con su tramo de la barra (verde/amarillo/naranja).
function textoClasificacionImc(d: DepartamentoResumen): React.ReactNode {
  const { bajoPeso, normopeso, sobrepeso, obesidad } = d.distribucionImc;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full inline-block" style={{ backgroundColor: "#54BBAB" }}></span>
        Peso Ideal <strong>{normopeso + bajoPeso}</strong>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full inline-block" style={{ backgroundColor: "#FFC627" }}></span>
        Sobrepeso <strong>{sobrepeso}</strong>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full inline-block" style={{ backgroundColor: "#EE7523" }}></span>
        Obesidad <strong>{obesidad}</strong>
      </span>
    </div>
  );
}

const ClasificacionImcBar: React.FC<{ departamento: DepartamentoResumen }> = ({ departamento }) => {
  const segmentos = segmentosClasificacionImc(departamento);
  if (segmentos.length === 0) return <span className="text-[10px] text-gray-300">Sin datos</span>;

  return (
    <div className="flex h-2.5 w-full rounded overflow-hidden">
      {/* scaleX en vez de animar `width`: así el navegador solo compone (GPU),
          no recalcula layout en cada frame — width vía inline style se queda
          fijo, es transform-origin left lo que hace que "crezca" visualmente. */}
      {segmentos.map((s, i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ width: `${s.pct}%`, backgroundColor: s.color, transformOrigin: "left" }}
        ></motion.div>
      ))}
    </div>
  );
};

type NivelAlerta = DepartamentoResumen["nivelAlerta"];
// Pendiente: aún no hay dato de tipo de empleado por departamento en el
// agregado (resumenMedicoIA.ts); el select ya está pero no filtra todavía.
type TipoEmpleado = "confianza" | "sindicalizado";

const NIVELES_ALERTA: { value: NivelAlerta; label: string }[] = [
  { value: "bajo", label: "Bajo" },
  { value: "moderado", label: "Moderado" },
  { value: "alto", label: "Alto" },
];

const TIPOS_EMPLEADO: { value: TipoEmpleado; label: string }[] = [
  { value: "confianza", label: "Confianza" },
  { value: "sindicalizado", label: "Sindicalizado" },
];

type SortCol = "nombre" | "total" | "imc" | "riesgo" | null;
type SortDir = "asc" | "desc" | "none";

// Tabla de departamentos: mismos agregados deterministas que "Resumen médico
// (IA)" (resumenMedicoIA.ts), en formato tabular. Cada fila navega a la ventana
// específica de ese departamento. Mismo diseño visual (encabezado, buscador,
// íconos) que PacientesTabla.tsx (Pacientes/Reingresos), para que todas las
// tablas del sistema se vean igual — sin paginado: la cantidad de
// departamentos es acotada, así que siempre se listan todos de una vez.
const DepartamentoTabla: React.FC<DepartamentoTablaProps> = ({ departamentos, onSeleccionar }) => {
  const [busqueda, setBusqueda] = useState("");
  const [showFiltros, setShowFiltros] = useState(true);
  const [filtroAlerta, setFiltroAlerta] = useState<"" | NivelAlerta>("");
  // Todavía no filtra nada (ver nota en el tipo TipoEmpleado); queda listo
  // para conectarse cuando el dato de tipo de empleado esté disponible.
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoEmpleado>("");

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

  const hayFiltrosActivos = Boolean(busqueda || filtroAlerta || filtroTipo);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return departamentos.filter((d) => {
      if (q && !d.nombre.toLowerCase().includes(q)) return false;
      if (filtroAlerta && d.nivelAlerta !== filtroAlerta) return false;
      return true;
    });
  }, [departamentos, busqueda, filtroAlerta]);

  const ordenados = useMemo(() => {
    if (!sortCol || sortDir === "none") return filtrados;
    const factor = sortDir === "asc" ? 1 : -1;
    const valor = (d: DepartamentoResumen): number | string => {
      if (sortCol === "nombre") return d.nombre;
      if (sortCol === "total") return d.poblacion;
      if (sortCol === "imc") return d.vsPromedio.imc.valor ?? -Infinity;
      return d.vsPromedio.riesgoAltoPct.valor ?? -Infinity;
    };
    return [...filtrados].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (typeof va === "string" && typeof vb === "string") return factor * va.localeCompare(vb, "es", { numeric: true });
      return factor * ((va as number) - (vb as number));
    });
  }, [filtrados, sortCol, sortDir]);

  if (departamentos.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-8">No hay departamentos registrados en la población.</p>;
  }

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
    <div>
      {/* Alto FIJO (no max-h): la caja siempre mide lo mismo, tenga 0, 3 o 30
          filas después de buscar/filtrar — solo cuando hay más de ~10 aparece
          scroll, en vez de que la tabla crezca/encoja según el resultado. */}
      <div className="h-[420px] overflow-auto rounded-lg">
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="text-gray-700 text-left">
              {encabezado("nombre", "Nombre", "", "fa-solid fa-building")}
              {encabezado("total", "Total", "text-left w-[100px]", "fa-solid fa-users")}
              {encabezado("imc", "IMC promedio", "text-left w-[200px] pr-6", "fa-solid fa-weight-scale")}
              {encabezado("riesgo", "Riesgo", "text-right w-[100px]", "fa-solid fa-radiation")}
              <th className="pl-5 pr-1 py-3 font-semibold text-left w-[180px]">Clasificación</th>
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
                <td className="px-5 py-2">
                  <div className="relative w-94">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar departamento"
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
                <td colSpan={3} className="px-5 py-2"></td>
                <td className="px-5 py-2 text-right hidden">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[11px] font-medium text-gray-500">Tipo</span>
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value as "" | TipoEmpleado)}
                      className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                    >
                      <option value="">Todos</option>
                      {TIPOS_EMPLEADO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </td>
                <td className="pl-5 pr-1 py-2 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-500">Alerta</span>
                    <select
                      value={filtroAlerta}
                      onChange={(e) => setFiltroAlerta(e.target.value as "" | NivelAlerta)}
                      className="text-xs h-7 rounded-md shadow-xs px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                    >
                      <option value="">Todas</option>
                      {NIVELES_ALERTA.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </td>
                <td className="w-8 pl-1 pr-3 py-2"></td>
              </tr>
            )}
          </thead>
          <tbody>
            {ordenados.map((d) => (
              <tr
                key={d.nombre}
                onClick={() => onSeleccionar(d.nombre)}
                className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
              >
                <td className="px-5 py-2 font-bold text-gray-700 truncate group-hover:text-sea-blue transition-colors">{d.nombre}</td>
                <td className="px-5 py-2 text-left text-gray-500 group-hover:font-semibold transition-all">{d.poblacion.toLocaleString("es-MX")}</td>
                <td className="px-5 py-2 text-left text-gray-500 group-hover:font-semibold transition-all">
                  {/* Sin ícono/tooltip cuando no hay tendencia confiable
                      (n insuficiente): no hay nada útil que mostrar. */}
                  {d.tendencias.imc ? (
                    <Tooltip texto={textoTendencia(d.tendencias.imc)}>
                      <span className="inline-flex items-center gap-1.5">
                        {fmt(d.vsPromedio.imc.valor)}
                        <IconoTendencia tendencia={d.tendencias.imc} />
                      </span>
                    </Tooltip>
                  ) : (
                    fmt(d.vsPromedio.imc.valor)
                  )}
                </td>
                <td className="px-5 py-2 text-right text-gray-500 group-hover:font-semibold transition-all">{fmt(d.vsPromedio.riesgoAltoPct.valor, "%")}</td>
                <td className="pl-5 pr-1 py-2 text-left">
                  <Tooltip texto={textoClasificacionImc(d)} sinLimiteAncho ocuparAncho>
                    <ClasificacionImcBar departamento={d} />
                  </Tooltip>
                </td>
                <td className="w-8 pl-1 pr-3 py-2 text-right text-gray-400 group-hover:text-sea-blue transition-colors">
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </td>
              </tr>
            ))}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 text-xs py-8">Sin coincidencias.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center px-5 py-3 shrink-0">
        <span className="text-xs font-bold text-gray-400">
          {ordenados.length.toLocaleString("es-MX")} departamento{ordenados.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
};

export default DepartamentoTabla;
