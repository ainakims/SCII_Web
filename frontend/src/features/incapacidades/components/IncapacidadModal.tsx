import API_BASE_URL from "../../../config";
import { fetchWithAuth } from "../../../services/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthToken";

// Modal de "expediente" de incapacidades de un paciente: historial de
// folios emitidos + alta de una nueva incapacidad/prórroga, siguiendo el
// mismo patrón de modal grande que PacienteRegistroModal.tsx (overlay +
// tarjeta blanca + header con cerrar) en vez del look IMSS verde/dorado del
// mockup en el que se basó este módulo.
export interface IncapacidadPaciente {
  Empl_matricula: string;
  Empl_Nombres: string;
  Especialidad?: string;
  Compania?: string;
}

type Ramo = "EG" | "RT" | "MA";
type Tipo = "Inicial" | "Subsecuente" | "Recaida" | "Maternidad";
type Estado = "Activa" | "Vencida";

export interface IncapacidadRegistro {
  Id?: number;
  Folio?: string;
  Ramo: Ramo;
  Tipo: Tipo;
  FolioAnterior?: string | null;
  FechaInicio: string;
  Dias: number;
  FechaFin?: string;
  Cie10: string;
  Diagnostico: string;
  ST7?: boolean;
  Sbc?: number | null;
  Subsidio?: number | null;
  Estado?: Estado;
  MedicoNombre?: string;
  MedicoMatricula?: string;
}

interface FormState {
  ramo: Ramo;
  tipo: Tipo;
  folioAnterior: string;
  fechaInicio: string;
  dias: number;
  cie10: string;
  diagnostico: string;
  st7: boolean;
  sbc: string;
}

const RAMO_OPTIONS: { value: Ramo; label: string }[] = [
  { value: "EG", label: "Enfermedad General (EG)" },
  { value: "RT", label: "Riesgo de Trabajo (RT)" },
  { value: "MA", label: "Maternidad (MA)" },
];

const TIPO_OPTIONS: { value: Tipo; label: string }[] = [
  { value: "Inicial", label: "Inicial" },
  { value: "Subsecuente", label: "Subsecuente / Prórroga" },
  { value: "Recaida", label: "Recaída" },
  { value: "Maternidad", label: "Maternidad (84 días)" },
];

const RAMO_LABEL: Record<Ramo, string> = { EG: "Enfermedad General", RT: "Riesgo de Trabajo", MA: "Maternidad" };
const RAMO_BADGE: Record<Ramo, string> = {
  EG: "bg-horz-blue/15 text-sea-blue",
  RT: "bg-sunray-yellow/15 text-sunset-orange",
  MA: "bg-fuchsia-100 text-fuchsia-600",
};
const ESTADO_BADGE: Record<Estado, string> = {
  Activa: "bg-aqua-green/15 text-aqua-green",
  Vencida: "bg-gray-100 text-gray-500",
};

const DEFAULT_FORM: FormState = {
  ramo: "EG",
  tipo: "Inicial",
  folioAnterior: "",
  fechaInicio: new Date().toISOString().split("T")[0],
  dias: 3,
  cie10: "",
  diagnostico: "",
  st7: false,
  sbc: "",
};

const calcularFechaFin = (fechaInicio: string, dias: number): string => {
  if (!fechaInicio || !dias || dias <= 0) return "";
  const d = new Date(`${fechaInicio}T00:00:00`);
  d.setDate(d.getDate() + (dias - 1));
  return d.toISOString().split("T")[0];
};

const calcularSubsidio = (ramo: Ramo, tipo: Tipo, dias: number, sbc: number): { monto: number; explicacion: string } => {
  if (!sbc || sbc <= 0 || !dias || dias <= 0) {
    return { monto: 0, explicacion: "Captura los días y el SBC para estimar el monto del subsidio." };
  }
  if (ramo === "RT") {
    return { monto: dias * sbc, explicacion: "Riesgo de Trabajo (RT): cubierto al 100% del SBC desde el día 1 por el IMSS." };
  }
  if (ramo === "MA") {
    return { monto: dias * sbc, explicacion: "Maternidad (MA): cubierto al 100% del SBC por los días autorizados." };
  }
  if (tipo === "Subsecuente" || tipo === "Recaida") {
    return { monto: dias * sbc * 0.6, explicacion: "Enfermedad General (Subsecuente/Recaída): se cubre al 60% del SBC desde el primer día." };
  }
  if (dias > 3) {
    const diasPagados = dias - 3;
    return { monto: diasPagados * sbc * 0.6, explicacion: `Enfermedad General (Inicial): primeros 3 días exentos de subsidio IMSS. ${diasPagados} día(s) cubiertos al 60% del SBC.` };
  }
  return { monto: 0, explicacion: "Enfermedad General (Inicial ≤ 3 días): días exentos de subsidio IMSS conforme al Art. 96 LSS." };
};

const formatFecha = (fecha: string | undefined): string => {
  if (!fecha) return "--/--/----";
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatMonto = (monto: number | null | undefined): string =>
  `$${(monto ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

interface IncapacidadModalProps {
  open: boolean;
  paciente: IncapacidadPaciente | null;
  onClose: () => void;
}

const IncapacidadModal: React.FC<IncapacidadModalProps> = ({ open, paciente, onClose }) => {
  const { user } = useAuth() as { user: { nombre?: string; matricula?: string } };

  // Se conserva el último paciente no nulo para poder seguir renderizando
  // su nombre/matrícula durante la animación de salida del modal (el padre
  // limpia `paciente` a null en el mismo render en que pone `open` en false).
  const [pacienteMostrado, setPacienteMostrado] = useState<IncapacidadPaciente | null>(paciente);
  useEffect(() => {
    if (paciente) setPacienteMostrado(paciente);
  }, [paciente]);

  const [tab, setTab] = useState<"historial" | "nueva">("historial");
  const [historial, setHistorial] = useState<IncapacidadRegistro[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [certificado, setCertificado] = useState<IncapacidadRegistro | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Incapacidad_${certificado?.Folio || "Certificado"}`,
  });

  const matricula = paciente?.Empl_matricula ?? "";

  const fetchHistorial = async (mat: string): Promise<void> => {
    setLoadingHistorial(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Incapacidades/ObtenerHistorial`, {
        method: "POST",
        body: JSON.stringify({ matricula: mat }),
      });
      const json = await res.json().catch(() => null);
      setHistorial(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("Error al obtener historial de incapacidades:", err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (!open || !matricula) return;
    setTab("historial");
    setForm(DEFAULT_FORM);
    fetchHistorial(matricula);
  }, [open, matricula]);

  const hasActiva = historial.some((i) => i.Estado === "Activa");

  const fechaFinCalculada = useMemo(() => calcularFechaFin(form.fechaInicio, form.dias), [form.fechaInicio, form.dias]);
  const { monto: montoSubsidio, explicacion: subsidioExplicacion } = useMemo(
    () => calcularSubsidio(form.ramo, form.tipo, form.dias, Number(form.sbc) || 0),
    [form.ramo, form.tipo, form.dias, form.sbc]
  );

  const handleRamoChange = (value: Ramo) => {
    setForm((prev) => {
      const next = { ...prev, ramo: value };
      if (value === "MA") { next.tipo = "Maternidad"; next.dias = 84; }
      if (value !== "RT") next.st7 = false;
      return next;
    });
  };

  const handleTipoChange = (value: Tipo) => {
    setForm((prev) => {
      const next = { ...prev, tipo: value };
      if (value === "Maternidad") { next.ramo = "MA"; next.dias = 84; }
      return next;
    });
  };

  const errorModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="fa-solid fa-exclamation aviso-exclamation"></i><style>.aviso-exclamation{font-size:90px;}</style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="fa-solid fa-check success-icon"></i><style>.success-icon{color:#545454;font-size:90px;}</style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });
  };

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!matricula) return;

    if ((form.tipo === "Subsecuente" || form.tipo === "Recaida") && !form.folioAnterior) {
      errorModal("Campo requerido", "Selecciona el <b>folio anterior</b> al que da continuidad esta incapacidad.");
      return;
    }
    if (!form.cie10.trim() || !form.diagnostico.trim()) {
      errorModal("Campo requerido", "Captura el <b>código CIE-10</b> y el <b>diagnóstico</b>.");
      return;
    }
    if (!form.fechaInicio || !form.dias || form.dias <= 0) {
      errorModal("Datos incompletos", "Verifica la <b>fecha de inicio</b> y los <b>días autorizados</b>.");
      return;
    }

    const payload = {
      Matricula: matricula,
      Ramo: form.ramo,
      Tipo: form.tipo,
      FolioAnterior: form.folioAnterior || null,
      FechaInicio: form.fechaInicio,
      Dias: Number(form.dias),
      FechaFin: fechaFinCalculada,
      Cie10: form.cie10.toUpperCase().trim(),
      Diagnostico: form.diagnostico.trim(),
      ST7: form.ramo === "RT" ? form.st7 : false,
      Sbc: form.sbc ? Number(form.sbc) : null,
      Subsidio: montoSubsidio,
      MedicoNombre: user?.nombre ?? "",
      MedicoMatricula: user?.matricula ?? "",
    };

    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Incapacidades/Registrar`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setForm(DEFAULT_FORM);
        await fetchHistorial(matricula);
        setTab("historial");
        exitoModal("Incapacidad registrada", "El certificado de incapacidad se registró correctamente en el expediente.");
      } else {
        const errText = await res.text().catch(() => "");
        errorModal("Error al guardar", errText || "Ocurrió un error al registrar la incapacidad.");
      }
    } catch (err) {
      errorModal("Ocurrió un error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return "--";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      {open && pacienteMostrado && (
        <motion.div
          key="incapacidad-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
      <motion.div
        key="incapacidad-modal-panel"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white bg-linear-to-b from-sea-blue to-sky-blue shadow-sm">
              {getInitials(pacienteMostrado.Empl_Nombres)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-sea-blue truncate uppercase">{pacienteMostrado.Empl_Nombres}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${hasActiva ? ESTADO_BADGE.Activa : "bg-gray-100 text-gray-500"}`}>
                  {hasActiva ? "Incapacidad activa" : "Sin incapacidad activa"}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Matrícula: {pacienteMostrado.Empl_matricula} {pacienteMostrado.Especialidad ? `· ${pacienteMostrado.Especialidad}` : ""} {pacienteMostrado.Compania ? `· ${pacienteMostrado.Compania}` : ""}
              </p>
            </div>
          </div>
          <button
            title="Cerrar"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-lg transition-all cursor-pointer shrink-0"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-3 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setTab("historial")}
            className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${tab === "historial" ? "border-sea-blue text-sea-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <i className="fa-solid fa-list-check"></i>
            Historial de Incapacidades
          </button>
          <button
            onClick={() => setTab("nueva")}
            className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${tab === "nueva" ? "border-sea-blue text-sea-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <i className="fa-solid fa-file-circle-plus"></i>
            Registrar Nueva / Prórroga
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
          {tab === "historial" ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Folios emitidos</h3>
                <button
                  onClick={() => setTab("nueva")}
                  className="bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <i className="fa-solid fa-plus"></i>
                  Emitir Certificado
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-linear-to-r from-white to-gray-100 text-gray-700">
                      <th className="p-3 font-semibold">Folio</th>
                      <th className="p-3 font-semibold">Ramo</th>
                      <th className="p-3 font-semibold">Tipo</th>
                      <th className="p-3 font-semibold">Inicio / Término</th>
                      <th className="p-3 font-semibold text-center">Días</th>
                      <th className="p-3 font-semibold">Diagnóstico</th>
                      <th className="p-3 font-semibold text-right">Subsidio Est.</th>
                      <th className="p-3 font-semibold text-center">Estado</th>
                      <th className="p-3 font-semibold text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingHistorial ? (
                      <tr>
                        <td colSpan={9} className="text-center text-gray-400 py-8">
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i>Cargando historial...
                        </td>
                      </tr>
                    ) : historial.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-gray-400 py-8">
                          <i className="fa-solid fa-folder-open text-xl mb-1.5 block"></i>
                          Sin incapacidades registradas para este paciente.
                        </td>
                      </tr>
                    ) : (
                      historial.map((inc) => (
                        <tr key={inc.Id ?? inc.Folio} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 font-bold text-sea-blue">{inc.Folio}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${RAMO_BADGE[inc.Ramo]}`}>{inc.Ramo}</span>
                          </td>
                          <td className="p-3 text-gray-600">{inc.Tipo}</td>
                          <td className="p-3 text-gray-500 whitespace-nowrap">{formatFecha(inc.FechaInicio)} al {formatFecha(inc.FechaFin)}</td>
                          <td className="p-3 text-center font-bold text-gray-700">{inc.Dias} d</td>
                          <td className="p-3 max-w-[220px] truncate text-gray-600" title={inc.Diagnostico}>
                            <span className="font-mono text-[10px] text-gray-400 mr-1">[{inc.Cie10}]</span>{inc.Diagnostico}
                          </td>
                          <td className="p-3 text-right font-semibold text-aqua-green">{formatMonto(inc.Subsidio)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[inc.Estado ?? "Vencida"]}`}>{inc.Estado ?? "--"}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setCertificado(inc)}
                              title="Ver / Imprimir certificado"
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-sea-blue hover:bg-gray-100 transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-print text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <form id="incapacidadForm" onSubmit={handleGuardar} className="space-y-4">
              <div className="bg-white p-5 rounded-xl shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-gray-800 flex items-center">
                  <i className="fa-solid fa-stethoscope mr-2 text-sea-blue"></i>
                  Datos del Certificado Médico
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ramo de Seguro</label>
                    <select
                      value={form.ramo}
                      onChange={(e) => handleRamoChange(e.target.value as Ramo)}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none cursor-pointer"
                    >
                      {RAMO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Certificado</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => handleTipoChange(e.target.value as Tipo)}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none cursor-pointer"
                    >
                      {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {(form.tipo === "Subsecuente" || form.tipo === "Recaida") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Folio Anterior</label>
                      <select
                        value={form.folioAnterior}
                        onChange={(e) => setForm((p) => ({ ...p, folioAnterior: e.target.value }))}
                        className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none cursor-pointer"
                      >
                        <option value="">-- Seleccionar folio previo --</option>
                        {historial.map((inc) => (
                          <option key={inc.Id ?? inc.Folio} value={inc.Folio}>{inc.Folio} ({inc.Ramo} · {formatFecha(inc.FechaInicio)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={form.fechaInicio}
                      onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Días Autorizados</label>
                    <input
                      type="number"
                      min={1}
                      max={form.ramo === "MA" ? 84 : 365}
                      value={form.dias}
                      onChange={(e) => setForm((p) => ({ ...p, dias: Number(e.target.value) || 0 }))}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs font-bold text-sea-blue focus:ring-1 focus:ring-sea-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Término (Calculada)</label>
                    <input
                      type="text"
                      readOnly
                      value={formatFecha(fechaFinCalculada)}
                      className="w-full border border-gray-50 shadow-xs bg-gray-50 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Código Diagnóstico (CIE-10)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.cie10}
                        onChange={(e) => setForm((p) => ({ ...p, cie10: e.target.value.toUpperCase() }))}
                        placeholder="M54.5"
                        maxLength={8}
                        className="w-24 uppercase font-mono border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      />
                      <input
                        type="text"
                        value={form.diagnostico}
                        onChange={(e) => setForm((p) => ({ ...p, diagnostico: e.target.value }))}
                        placeholder="Descripción del diagnóstico"
                        className="flex-1 border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      SBC diario <span className="text-gray-400 font-normal">(opcional, para estimar subsidio)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.sbc}
                      onChange={(e) => setForm((p) => ({ ...p, sbc: e.target.value }))}
                      placeholder="$ 0.00"
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                    />
                  </div>
                </div>

                {form.ramo === "RT" && (
                  <div className="p-3 bg-sunray-yellow/10 rounded-lg flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-sunset-orange cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.st7}
                        onChange={(e) => setForm((p) => ({ ...p, st7: e.target.checked }))}
                        className="w-4 h-4 accent-sunset-orange cursor-pointer"
                      />
                      ¿Cuenta con Formato ST-7 (Aviso de Accidente/Enfermedad de Trabajo)?
                    </label>
                    <span className="text-[10px] text-sunset-orange/80 italic shrink-0">Requisito para pago al 100% por RT</span>
                  </div>
                )}
              </div>

              <div className="bg-horz-blue/10 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sea-blue flex items-center gap-1.5">
                    <i className="fa-solid fa-calculator"></i>
                    Estimación de Subsidio
                  </h4>
                  <p className="text-xs text-gray-500">{subsidioExplicacion}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-xs text-gray-500 font-medium">Monto estimado:</span>
                  <span className="text-xl font-black text-sea-blue">{formatMonto(montoSubsidio)}</span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer (solo en tab "nueva") */}
        {tab === "nueva" && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setTab("historial")}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              form="incapacidadForm"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
              Emitir y Registrar Incapacidad
            </button>
          </div>
        )}
      </motion.div>

      {/* Sub-modal: vista previa / impresión del certificado, con su propia animación independiente */}
      <AnimatePresence>
        {certificado && (
          <motion.div
            key="certificado-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setCertificado(null); }}
          >
          <motion.div
            key="certificado-modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
              <p className="text-xs font-bold text-sea-blue flex items-center gap-2">
                <i className="fa-solid fa-print"></i>
                Certificado de Incapacidad · Vista de Impresión
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint()}
                  className="bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <i className="fa-solid fa-print"></i>
                  Imprimir / Guardar PDF
                </button>
                <button
                  title="Cerrar"
                  onClick={() => setCertificado(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div ref={printRef} className="border-2 border-sea-blue/20 rounded-xl p-5 space-y-4 text-xs bg-white">
                <div className="flex justify-between items-start border-b-2 border-sea-blue/20 pb-3">
                  <div>
                    <h1 className="font-bold text-sm text-sea-blue uppercase tracking-tight">Certificado de Incapacidad Temporal</h1>
                    <p className="text-[10px] text-gray-500">Módulo de Salud e Incapacidades</p>
                  </div>
                  <div className="bg-horz-blue/10 border border-horz-blue/30 p-1.5 rounded text-center min-w-32">
                    <span className="block text-[9px] font-bold text-gray-500">FOLIO</span>
                    <strong className="text-sm font-mono text-sea-blue">{certificado.Folio}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2.5 rounded border border-gray-100">
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">ASEGURADO</span>
                    <span className="font-bold uppercase text-gray-800">{pacienteMostrado.Empl_Nombres}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">MATRÍCULA</span>
                    <span className="font-mono font-bold text-gray-800">{pacienteMostrado.Empl_matricula}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 border border-gray-100 rounded p-2.5 bg-aqua-green/5">
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">RAMO</span>
                    <span className="font-bold text-sea-blue">{RAMO_LABEL[certificado.Ramo]}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">TIPO</span>
                    <span className="font-bold text-gray-800">{certificado.Tipo}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">DÍAS</span>
                    <span className="font-black text-sea-blue text-sm">{certificado.Dias}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold">FOLIO ANTERIOR</span>
                    <span className="font-mono text-gray-600">{certificado.FolioAnterior || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-gray-100 rounded p-2.5">
                  <div className="flex justify-between items-center pr-3 border-r border-gray-100">
                    <span className="text-[10px] text-gray-500 font-bold">A PARTIR DEL</span>
                    <strong className="text-gray-800 text-sm">{formatFecha(certificado.FechaInicio)}</strong>
                  </div>
                  <div className="flex justify-between items-center pl-2">
                    <span className="text-[10px] text-gray-500 font-bold">HASTA EL</span>
                    <strong className="text-gray-800 text-sm">{formatFecha(certificado.FechaFin)}</strong>
                  </div>
                </div>

                <div className="border border-gray-100 rounded p-2.5">
                  <span className="block text-[9px] text-gray-500 font-bold">DIAGNÓSTICO (CIE-10)</span>
                  <p className="font-medium text-gray-800 mt-0.5">[{certificado.Cie10}] {certificado.Diagnostico}</p>
                </div>

                <div className="pt-4 text-center">
                  <div className="border-b border-gray-300 pb-1 mx-10 font-semibold text-gray-800">
                    {certificado.MedicoNombre || user?.nombre || ""}
                  </div>
                  <span className="block text-[9px] text-gray-500 mt-1">NOMBRE Y FIRMA DEL MÉDICO TRATANTE</span>
                  <span className="block text-[9px] font-mono text-gray-500">MATRÍCULA: {certificado.MedicoMatricula || user?.matricula || ""}</span>
                </div>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncapacidadModal;
