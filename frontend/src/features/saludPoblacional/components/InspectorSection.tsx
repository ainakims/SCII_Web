import React, { useMemo, useState } from "react";
import { RegistroValidado, ValorNormalizado } from "../types";
import { NIVEL_ESTILOS } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import QualityBadge from "./shared/QualityBadge";

interface InspectorSectionProps {
  historico: RegistroValidado[];
}

interface ResumenMatricula {
  matricula: string;
  nEvaluaciones: number;
  ultimaFecha: string | null;
  inconsistenciasImc: number;
  duplicados: number;
}

const ESTADO_A_NIVEL: Record<string, keyof typeof NIVEL_ESTILOS> = {
  VALIDO: "normal",
  FUERA_DE_RANGO: "leve",
  INCONSISTENTE: "alto",
  PENDIENTE: "bajo",
  NO_APLICA: "bajo",
  INVALIDO: "alto",
  FALTANTE: "sin_dato",
};

const CampoTrazado: React.FC<{ label: string; v: ValorNormalizado; unidad?: string }> = ({ label, v, unidad }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs">
    <span className="text-gray-500">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-[10px]">crudo: {v.original == null || v.original === "" ? "NULL" : String(v.original)}</span>
      <span className="font-semibold text-gray-700">{v.numerico != null ? `${v.numerico}${unidad ?? ""}` : "—"}</span>
      <QualityBadge label={v.estado.replace("_", " ")} nivel={ESTADO_A_NIVEL[v.estado] ?? "sin_dato"} />
    </div>
  </div>
);

const ModalHistorial: React.FC<{ matricula: string; registros: RegistroValidado[]; onClose: () => void }> = ({ matricula, registros, onClose }) => {
  const ordenados = useMemo(
    () => [...registros].sort((a, b) => new Date(a.Fecha.original ?? 0).getTime() - new Date(b.Fecha.original ?? 0).getTime()),
    [registros]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-sea-blue flex items-center">
            <i className="mdi mdi-account-clock-outline mr-2"></i>
            Historial longitudinal — Matrícula {matricula}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-sea-blue cursor-pointer">
            <i className="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {ordenados.map((r) => (
            <div key={r.Id} className="p-4 rounded-xl shadow-md bg-linear-to-b from-white to-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">
                  <i className="mdi mdi-calendar mr-1"></i>
                  {r.Fecha.valida ? r.Fecha.original : `Fecha inválida (${r.Fecha.motivo ?? "sin detalle"})`}
                </span>
                <div className="flex items-center gap-1.5">
                  {r.esDuplicado && <QualityBadge label="Duplicado" nivel="leve" />}
                  <span className="text-[10px] text-gray-400">Id {r.Id}</span>
                </div>
              </div>
              <CampoTrazado label="Sistólica" v={r.Sistolica} unidad=" mmHg" />
              <CampoTrazado label="Diastólica" v={r.Diastolica} unidad=" mmHg" />
              <CampoTrazado label="Glucosa" v={r.Glucosa} unidad=" mg/dL" />
              <CampoTrazado label="Colesterol" v={r.Colesterol} unidad=" mg/dL" />
              <CampoTrazado label="Triglicéridos" v={r.Trigliceridos} unidad=" mg/dL" />
              <CampoTrazado label="Peso" v={r.Peso} unidad=" kg" />
              <CampoTrazado label="Altura" v={r.Altura} unidad=" m" />
              <CampoTrazado label="Perímetro abdominal (PA)" v={r.PA} unidad=" cm" />
              <CampoTrazado label="ICT" v={r.ICT} />
              <div className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-gray-500">IMC</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">reportado: {r.IMC.original ?? "NULL"} · calculado: {r.IMC.calculado ?? "—"}</span>
                  <span className="font-semibold text-gray-700">{r.IMC.usado ?? "—"}</span>
                  <QualityBadge label={r.IMC.estado.replace("_", " ")} nivel={ESTADO_A_NIVEL[r.IMC.estado] ?? "sin_dato"} />
                </div>
              </div>
            </div>
          ))}
          {ordenados.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Sin registros para esta matrícula.</p>}
        </div>
      </div>
    </div>
  );
};

// Sección 40 del documento (trazabilidad): permite auditar el dato crudo vs.
// normalizado de cualquier registro, y consultar el historial longitudinal
// completo de una persona. Opera sobre el mismo dataset filtrado que el resto
// del dashboard.
const InspectorSection: React.FC<InspectorSectionProps> = ({ historico }) => {
  const [busqueda, setBusqueda] = useState("");
  const [matriculaAbierta, setMatriculaAbierta] = useState<string | null>(null);

  const resumenPorMatricula = useMemo(() => {
    const mapa = new Map<string, ResumenMatricula>();
    historico.forEach((r) => {
      const actual = mapa.get(r.Matricula) ?? { matricula: r.Matricula, nEvaluaciones: 0, ultimaFecha: null, inconsistenciasImc: 0, duplicados: 0 };
      actual.nEvaluaciones++;
      if (r.Fecha.valida && (!actual.ultimaFecha || new Date(r.Fecha.original as string) > new Date(actual.ultimaFecha))) {
        actual.ultimaFecha = r.Fecha.original;
      }
      if (r.IMC.estado === "INCONSISTENTE") actual.inconsistenciasImc++;
      if (r.esDuplicado) actual.duplicados++;
      mapa.set(r.Matricula, actual);
    });
    return Array.from(mapa.values()).sort((a, b) => a.matricula.localeCompare(b.matricula));
  }, [historico]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = q ? resumenPorMatricula.filter((m) => m.matricula.toLowerCase().includes(q)) : resumenPorMatricula;
    return base.slice(0, 100);
  }, [resumenPorMatricula, busqueda]);

  const registrosMatriculaAbierta = useMemo(
    () => (matriculaAbierta ? historico.filter((r) => r.Matricula === matriculaAbierta) : []),
    [historico, matriculaAbierta]
  );

  return (
    <SectionCard icon="database-search-outline" title="Inspector de datos y trazabilidad" subtitle="Auditoría de calidad por matrícula: dato crudo vs. normalizado">
      <div className="relative mb-4 max-w-sm">
        <i className="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por matrícula..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-linear-to-r from-gray-50 to-gray-100 shadow-md shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-sky-blue/40"
        />
      </div>

      <p className="text-[10px] text-gray-400 mb-2">
        {resumenPorMatricula.length.toLocaleString("es-MX")} personas en la población filtrada. Mostrando {filtrados.length} coincidencia(s).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              <th className="py-2 font-semibold">Matrícula</th>
              <th className="py-2 font-semibold text-right">Evaluaciones</th>
              <th className="py-2 font-semibold text-right">Última fecha</th>
              <th className="py-2 font-semibold text-right">Inconsistencias IMC</th>
              <th className="py-2 font-semibold text-right">Duplicados</th>
              <th className="py-2 font-semibold text-right">Historial</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((m) => (
              <tr key={m.matricula} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="py-2 font-semibold text-gray-700">{m.matricula}</td>
                <td className="py-2 text-right text-gray-500">{m.nEvaluaciones}</td>
                <td className="py-2 text-right text-gray-500">{m.ultimaFecha ?? "Sin fecha válida"}</td>
                <td className="py-2 text-right">{m.inconsistenciasImc > 0 ? <QualityBadge label={String(m.inconsistenciasImc)} nivel="alto" /> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{m.duplicados > 0 ? <QualityBadge label={String(m.duplicados)} nivel="leve" /> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setMatriculaAbierta(m.matricula)}
                    className="text-sea-blue hover:text-sky-blue font-semibold cursor-pointer"
                  >
                    Ver historial <i className="mdi mdi-chevron-right"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Sin coincidencias.</p>}
      </div>

      {matriculaAbierta && (
        <ModalHistorial matricula={matriculaAbierta} registros={registrosMatriculaAbierta} onClose={() => setMatriculaAbierta(null)} />
      )}
    </SectionCard>
  );
};

export default InspectorSection;
