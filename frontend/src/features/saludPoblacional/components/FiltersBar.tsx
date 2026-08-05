import React, { useMemo } from "react";
import { RegistroValidado, Filtros, FILTROS_VACIOS, NivelRiesgoFiltro, TipoEmpleado } from "../types";

const NIVELES_RIESGO: NivelRiesgoFiltro[] = ["Sano", "Riesgo moderado", "Riesgo alto", "Sin clasificar"];
const TIPOS_EMPLEADO: TipoEmpleado[] = ["Confianza", "Sindicalizado"];

interface FiltersBarProps {
  registros: RegistroValidado[];
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
}

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2.5 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

function opcionesUnicas(registros: RegistroValidado[], campo: "Depto_nombre" | "Sexo"): string[] {
  const set = new Set<string>();
  registros.forEach((r) => {
    const v = (r[campo] ?? "").toString().trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

// Filtros globales (sección 19 del documento): periodo, departamento, sexo (solo si
// el dato existe), nivel de riesgo y tipo de empleado. Todos operan sobre el mismo
// dataset, garantizando que todo el dashboard responda al mismo contexto.
const FiltersBar: React.FC<FiltersBarProps> = ({ registros, filtros, onChange }) => {
  const departamentos = useMemo(() => opcionesUnicas(registros, "Depto_nombre"), [registros]);
  const sexos = useMemo(() => opcionesUnicas(registros, "Sexo"), [registros]);

  const anios = useMemo(() => {
    const set = new Set<number>();
    registros.forEach((r) => {
      if (r.Fecha.valida) set.add(new Date(r.Fecha.original as string).getFullYear());
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [registros]);

  const set = <K extends keyof Filtros>(key: K, value: Filtros[K]) => onChange({ ...filtros, [key]: value });

  const hayFiltrosActivos = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);

  return (
    <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800 flex items-center">
          <i className="mdi mdi-filter-variant text-sea-blue mr-2"></i>
          Filtros
        </h2>
        {hayFiltrosActivos && (
          <button
            onClick={() => onChange(FILTROS_VACIOS)}
            className="text-xs text-gray-400 hover:text-sea-blue transition-colors cursor-pointer flex items-center gap-1"
          >
            <i className="mdi mdi-close-circle-outline"></i>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="relative">
          <select className={selectCls} value={filtros.anioDesde ?? ""} onChange={(e) => set("anioDesde", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Desde (año)</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        <div className="relative">
          <select className={selectCls} value={filtros.anioHasta ?? ""} onChange={(e) => set("anioHasta", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Hasta (año)</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        <div className="relative">
          <select className={selectCls} value={filtros.departamento ?? ""} onChange={(e) => set("departamento", e.target.value || null)}>
            <option value="">Departamento</option>
            {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        <div className="relative">
          <select className={selectCls} value={filtros.nivelRiesgo ?? ""} onChange={(e) => set("nivelRiesgo", (e.target.value || null) as Filtros["nivelRiesgo"])}>
            <option value="">Nivel de riesgo</option>
            {NIVELES_RIESGO.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        <div className="relative">
          <select className={selectCls} value={filtros.tipoEmpleado ?? ""} onChange={(e) => set("tipoEmpleado", (e.target.value || null) as Filtros["tipoEmpleado"])}>
            <option value="">Tipo de empleado</option>
            {TIPOS_EMPLEADO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
        </div>

        {/* Sexo: solo se muestra si la fuente de datos realmente lo trae (sección 19). */}
        {sexos.length > 0 && (
          <div className="relative">
            <select className={selectCls} value={filtros.sexo ?? ""} onChange={(e) => set("sexo", e.target.value || null)}>
              <option value="">Sexo</option>
              {sexos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiltersBar;
