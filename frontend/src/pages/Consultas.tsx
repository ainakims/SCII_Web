import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useRef, memo } from "react";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import { useNavigate } from "react-router-dom";
import ShimmerOverlay from "../features/saludPoblacional/components/shared/ShimmerOverlay";
import { useSidebarWidth } from "../context/SidebarContext";

interface PatientData {
  id: number | null;
  matricula: string | null;
  nombre: string;
  embarcacion: string;
  tipoPaciente: "I" | "E" | null;
  estatus: string | null;
  especialidad: string;
  edad: string;
  alergiasMedicamentos: string | null;
  alergias: string | null;
}

interface FormData {
  FechaAtencion: string;
  TipoAtencion: string;
  TipoEnfermedad: string;
  ProtocoloAtencion: string;
  Procedimiento: string;
  PadecimientoActual: string;
  Diagnostico: string;
  Recomendaciones: string;
  RecetaMedica: string;
}

interface VitalSigns {
  Peso: string;
  Talla: string;
  IMC: string;
  Abdomen: string;
  ICT: string;
  Sistolica: string;
  Diastolica: string;
  TA: string;
  FC: string;
  FR: string;
  SpO2: string;
}

interface Medicamento {
  id: number;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}


interface Consulta {
  Abdomen: string;
  ICT?: string;
  Atencion: string;
  Diagnostico: string;
  PrimerosAux: number;
  Enfermedad?: string;
  FC?: string;
  FR?: string;
  FechaConsulta?: string;
  ID: number;
  IMC?: number;
  MedicoID: number;
  PA?: string;
  PacienteID: number;
  Padecimiento: string;
  Peso?: number;
  Protocolo: number;
  ProtocoloNombre: string;
  Procedimiento: string;
  Recomendacion: string;
  SpO2?: number;
  TA?: string;
  Talla?: number;
  Recetas: string;
  TipoAtencion?: string;
  TipoPaciente?: string;
}

interface AIResult {
  riesgo: string;
  inconsistencias: string[];
  sugerenciasTratamiento?: string[];
  sugerencias?: string[];
  diagnosticoDiferencial?: string[];
  diferencial?: string[];
  antecedentesRelevantes?: string[];
}

const formatDate = (d: string | number | Date) => {
  if (!d) return "-";

  return new Date(d).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

interface MedicamentoReceta {
  Farmaco: string;
  Dosis: string;
  Frecuencia: string;
  Duracion: string;
}

// Reutilizado por la vista ampliada del historial para mostrar la receta con el mismo formato que Recetas.tsx
const parseRecetaMeds = (recetasJson?: string): MedicamentoReceta[] => {
  if (!recetasJson) return [];
  try {
    const parsed = JSON.parse(recetasJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Valor por defecto para <input type="datetime-local">, en hora local (no UTC)
const toDatetimeLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// El backend (SOAP) puede devolver la fecha en distintos formatos de texto según el origen del dato
// (ISO, "dd/mm/yyyy hh:mm:ss", etc.), por lo que se intenta parsear de forma tolerante antes de formatear.
const parseFechaFlexible = (val: string | number | Date | null | undefined): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const str = String(val).trim();

  const nativo = new Date(str);
  if (!isNaN(nativo.getTime())) return nativo;

  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, d, m, y, h = "0", mi = "0", s = "0"] = match;
    const fecha = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi), Number(s));
    if (!isNaN(fecha.getTime())) return fecha;
  }

  return null;
};

const formatFechaMedicion = (val: string | number | Date | null | undefined) => {
  const fecha = parseFechaFlexible(val);
  if (!fecha) return val ? String(val) : "-";

  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const CkCell = memo(({ checked, onChange }: { checked: boolean | null; onChange: (v: boolean | null) => void }) => (
  <button
    type="button"
    onClick={() => onChange(checked ? null : true)}
    className={`w-5 h-5 rounded border transition-all cursor-pointer flex items-center justify-center shadow-xs ${
      checked ? "bg-linear-to-b from-sea-blue to-sky-blue text-white border-gray-400" : "border-gray-50 bg-white"
    }`}
  >
    {checked && <span className="text-[10px] font-bold">✓</span>}
  </button>
));

// Detecta valores sin capturar en la exploración física: null/undefined, cadena vacía,
// o números en 0 (incluye compuestos como "0 / 0" del campo T/A) — se muestran como "N/A".
const esVacioOCero = (val: string | number | null | undefined): boolean => {
  if (val === null || val === undefined) return true;
  const str = String(val).trim();
  if (str === "") return true;
  const nums = str.match(/-?\d+(\.\d+)?/g);
  if (!nums) return true;
  return nums.every((n) => parseFloat(n) === 0);
};

const formatExploracion = (val: string | number | null | undefined, unidad = ""): string =>
  esVacioOCero(val) ? "N/A" : `${val}${unidad}`;

const DetalleConsulta: React.FC<{ consulta: Consulta; onDelete: (id: number) => void; isFullscreen: boolean; onToggleFullscreen: () => void }> = ({ consulta, onDelete, isFullscreen, onToggleFullscreen }) => (
  <div className="flex flex-col h-full bg-white border-0 animate-in slide-in-from-right duration-200">
    <div className="py-4 px-5 min-h-[72px] flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        {/*
          <button className="h-10 w-10 flex items-center justify-center text-gray-300 cursor-default pointer-events-none">
            <i className="fa-solid fa-circle-question text-xl"></i>
          </button>
        */}
        {/* <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            <i className="fa-solid fa-calendar-days mr-1"></i>
            {formatDate(consulta.FechaConsulta ?? "")}
          </p>
          <p className="text-xs font-bold text-gray-800 truncate uppercase max-w-[320px]">
            Atención por {consulta.Atencion}
          </p>
        </div> */}
      </div>
      {!isFullscreen && (
        <div className="flex items-center gap-1">
          <button
            title="Ampliar vista y ver receta"
            onClick={onToggleFullscreen}
            className="w-10 h-10 text-gray-400 hover:text-sea-blue rounded-xl flex items-center justify-center transition-all group cursor-pointer"
          >
            <i className="fa-solid fa-expand text-lg"></i>
          </button>
          <button
            title="Eliminar"
            onClick={() => onDelete(consulta.ID)}
            className="w-10 h-10 text-gray-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all group cursor-pointer"
          >
            <i className="fa-solid fa-trash-arrow-up"></i>
          </button>
        </div>
      )}
    </div>

    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      {consulta.Diagnostico && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Diagnóstico
          </label>
          <div className="w-full px-3 py-2 border border-gray-50 text-sea-blue bg-blue-50 shadow-xs rounded-lg text-xs font-semibold uppercase outline-none">
            <i className="fa-solid fa-lightbulb mr-2"></i>
            {consulta.Diagnostico}
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Tipo de atención
        </label>
        <div className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
          {consulta.TipoAtencion
            ? consulta.TipoAtencion === "AUX" ? "Primeros auxilios" : "Enfermedad general" : ""}
        </div>
      </div>
      {consulta.PrimerosAux && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Atención primeros auxilios
          </label>
          <div className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            {consulta.PrimerosAux === 1 ? "Accidente de trabajo" : "Accidente de trayecto"}
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Protocolo de atención
        </label>
        <div className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
          {consulta.ProtocoloNombre}
        </div>
      </div>
      {consulta.Procedimiento && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Procedimiento realizado
          </label>
          <div className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            {consulta.Procedimiento}
          </div>
        </div>
      )}
      {consulta.Padecimiento && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Padecimiento actual
          </label>
          <div className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            {consulta.Padecimiento}
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Exploración fisica
        </label>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Weight className="h-3 w-3 mr-1 text-gray-400" /> */}
              Peso
            </span>
            <p>{formatExploracion(consulta.Peso, " kg")}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Ruler className="h-3 w-3 mr-1 text-gray-400" /> */}
              Altura
            </span>
            <p>{formatExploracion(consulta.Talla, " m")}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Scale className="h-3 w-3 mr-1 text-gray-400" /> */}
              IMC
            </span>
            <p>{formatExploracion(consulta.IMC)}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <RulerDimensionLine className="h-3 w-3 mr-1 text-gray-400" /> */}
              PA
            </span>
            <p>{formatExploracion(consulta.Abdomen, " cm")}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Dumbbell className="h-3 w-3 mr-1 text-gray-400" /> */}
              ICT
            </span>
            <p>{formatExploracion(consulta.ICT)}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 mb-1 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Activity className="h-3 w-3 mr-1 text-gray-400" /> */}
              T/A
            </span>
            <p>{formatExploracion(consulta.PA)}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <HeartPulse className="h-3 w-3 mr-1 text-gray-400" /> */}
              FC
            </span>
            <p>{formatExploracion(consulta.FC, " lmp")}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Wind className="h-3 w-3 mr-1 text-gray-400" /> */}
              FR
            </span>
            <p>{formatExploracion(consulta.FR, " rpm")}</p>
          </div>
          <div className="flex justify-between w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
            <span className="flex items-center gap-1">
              {/* <Bubbles className="h-3 w-3 mr-1 text-gray-400" /> */}
              SpO2
            </span>
            <p>{formatExploracion(consulta.SpO2, " %")}</p>
          </div>
        </div>
      </div>
      {consulta.Recomendacion && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Recomendaciones
          </label>
          <textarea
            rows={3}
            // className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none resize-none"
            className="w-full p-2.5 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small focus:ring-1 outline-none resize-none"
            value={consulta.Recomendacion}
            disabled
          />
        </div>
      )}
      {/* {consulta.Recetas && (() => {
        let recetas = [];

        try {
          recetas = JSON.parse(consulta.Recetas);
        } catch (e) {
          return null;
        }
      
        return (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lista de medicamentos
            </label>
            <div className="overflow-x-auto border border-gray-50 shadow-xs rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <tbody>
                  {recetas.map((r: any, i: number) => (
                    <tr key={i} className="pt-2 text-xs text-gray-400 bg-gray-50">
                      <td className="px-3 py-2 font-normal">
                        <div className="relative flex items-center leading-none">
                          <p>
                            {r.Farmaco}
                          </p>
                          <span className="absolute right-0 text-gray-400 text-xs pointer-events-none leading-none">
                            {r.Dosis}, c / {r.Frecuencia} horas {r.Duracion} días
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()} */}
    </div>
  </div>
);

const Consultas: React.FC = () => {
  // const { user } = useAuth() as { user: { id: number; } };
  const { user } = useAuth() as { user: { id: number; rol?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);

  // puesto?: string; matricula?: string

  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<Consulta[]>([]);
  const [anioExpandido, setAnioExpandido] = useState<number | null>(null);
  // const [recetaData, setRecetaData] = useState<Receta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);
  const [matriculaNotFound, setMatriculaNotFound] = useState(false);
  const [matriculaNotRegis, setMatriculaNotRegis] = useState(false);
  const [medicamentosReceta, setMedicamentosReceta] = useState<Medicamento[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedExp, setSelectedExp]   = useState<Consulta | null>(null);
  const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);

  // Ancho real del sidebar (vía contexto, reactivo al colapsar/expandir) para que el panel
  // en pantalla completa deje siempre el espacio correcto — "md:left-64" por sí solo no
  // reacciona si el sidebar está colapsado (w-20) en vez de expandido (w-64).
  const sidebarW = useSidebarWidth();
  const [viewportW, setViewportW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const fullscreenLeft = viewportW >= 768 ? sidebarW : 0;

  const recetaPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintReceta = useReactToPrint({
    contentRef: recetaPrintRef,
    documentTitle: `Receta_Consulta_${selectedExp?.ID || "Digital"}`,
  });
  const [saving, setSaving] = useState(false);
  const [citaLigada, setCitaLigada] = useState<{ id: number; fecha: string; hora: string; motivo?: string } | null>(null);
  const medicionMostradaRef = useRef<string | null>(null);
  const [medicionEquipo, setMedicionEquipo] = useState<any | null>(null);
  const [medicionCargando, setMedicionCargando] = useState(false);
  const [camposCargados, setCamposCargados] = useState({ sistolica: false, diastolica: false, fc: false, spo2: false });
  const signosCargados = camposCargados.sistolica || camposCargados.diastolica || camposCargados.fc || camposCargados.spo2;

  const [pacienteExterno, setPacienteExterno] = useState(false);

  const [patientData, setPatientData] = useState<PatientData>({
    id: null,
    matricula: null,
    nombre: "",
    embarcacion: "",
    tipoPaciente: null,
    estatus: null,
    especialidad: "",
    edad: "",
    alergiasMedicamentos: null,
    alergias: null,
  });

  const [formData, setFormData] = useState<FormData>({
    FechaAtencion: toDatetimeLocal(new Date()),
    TipoAtencion: "",
    TipoEnfermedad: "",
    ProtocoloAtencion: "",
    Procedimiento: "",
    PadecimientoActual: "",
    Diagnostico: "",
    Recomendaciones: "",
    RecetaMedica: "",
  })
  ;
  const sistolicaRef  = useRef<HTMLInputElement>(null);
  const diastolicaRef = useRef<HTMLInputElement>(null);

  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    Peso: "",
    Talla: "",
    IMC: "",
    Abdomen: "",
    ICT: "",
    Sistolica: "",
    Diastolica: "",
    TA: "",
    FC: "",
    FR: "",
    SpO2: "",
  });

  const [labs] = useState( {colesterol: "", trigliceridos: "", glucosa: "", hba1c: "" } );

  const agregarMedicamento = () => setMedicamentosReceta(p => [...p, { id: Date.now(), medicamento: "", dosis: "", frecuencia: "", duracion: "" }]);
  const actualizarMedicamento = (id: number, campo: keyof Medicamento, valor: string) => setMedicamentosReceta(p => p.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  const eliminarMedicamento = (id: number) => setMedicamentosReceta(p => p.filter(m => m.id !== id));

  const calcIMC = (peso: string, talla: string) => {
    const w = parseFloat(peso), h = parseFloat(talla);
    return (w > 0 && h > 0) ? (w / (h * h)).toFixed(2) : "";
  };

  // ICT = perímetro abdominal (cm) / talla (cm), como razón (ej. 0.51) — no como porcentaje.
  const calcICT = (abdomen: string, talla: string) => {
    const c = parseFloat(abdomen), h = parseFloat(talla);
    return (c > 0 && h > 0) ? (c / (h * 100)).toFixed(2) : "";
  };

  const handleMeasureChange = (field: "Peso" | "Talla", value: string) =>
    setVitalSigns(prev => {
      const next = { ...prev, [field]: value };
      next.IMC = calcIMC(next.Peso, next.Talla);
      next.ICT = calcICT(next.Abdomen, next.Talla);
      return next;
    }
  );

  const abreviarDia = (fecha: string) => {
    const dias: Record<string, string> = {
      domingo: "dom",
      lunes: "lun",
      martes: "mar",
      miércoles: "mié",
      miercoles: "mié",
      jueves: "jue",
      viernes: "vie",
      sábado: "sáb",
      sabado: "sáb",
    };
  
    const [dia, resto] = fecha.split(",");
    const diaAbrev = dias[dia.trim().toLowerCase()] || dia;
  
    return `${diaAbrev},${resto}`;
  };

  // const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  const handleSearchPatient = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientData(prev => ({ ...prev, id: null, matricula: val, nombre: "", embarcacion: "", edad: "", especialidad: "", alergiasMedicamentos: null, alergias: null }));
    setHistoryData([]);
    setShowHistory(false);
    setIsDetailOpen(false);
    setSelectedExp(null);
    setCitaLigada(null);
    medicionMostradaRef.current = null;
    setMedicionEquipo(null);
    setMedicionCargando(false);
    setAiResult(null);
    setAnalyzing(false);
    if (!val.trim()) setCamposCargados({ sistolica: false, diastolica: false, fc: false, spo2: false });
  };

  const fetchHistory = async (_tipo: string | null, patientId: number | string | null) => {
    setLoadingHistory(true);

    try {
      const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarHistorial`,
        {
          method: "POST",
          body: JSON.stringify({ idEmpleado: patientData.matricula || patientId })
        });

      const res = await cons.json();

      if (res) {
        const data: Consulta[] = res.data ?? [];
        setHistoryData(data);

        // Al recargar el historial, se abre por defecto el año más reciente.
        const anios = data
          .map(c => c.FechaConsulta ? new Date(c.FechaConsulta).getFullYear() : NaN)
          .filter(a => !isNaN(a));
        setAnioExpandido(anios.length ? Math.max(...anios) : null);
      }
    } catch (e) {
      console.error(e);
    }

    finally { setLoadingHistory(false); }
  };

  // Agrupa el historial por año (descendente, sin importar si son consecutivos)
  const historialPorAnio = (() => {
    const grupos = new Map<number, Consulta[]>();

    historyData.forEach(c => {
      const anio = c.FechaConsulta ? new Date(c.FechaConsulta).getFullYear() : null;
      if (anio == null || isNaN(anio)) return;
      if (!grupos.has(anio)) grupos.set(anio, []);
      grupos.get(anio)!.push(c);
    });

    return Array.from(grupos.entries()).sort((a, b) => b[0] - a[0]);
  })();

  const toggleAnio = (anio: number) => {
    setAnioExpandido(prev => (prev === anio ? null : anio));
  };

  const fetchAlergias = async (idPaciente: number | null, matricula: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Consultas/ObtenerAlergias`, {
        method: "POST",
        body: JSON.stringify({ idPaciente, matricula })
      });
      const json = await res.json();
      const data = json?.ok ? json.data : null;
      setPatientData(p => ({
        ...p,
        alergias: data?.Alergias?.trim() || null,
        alergiasMedicamentos: data?.AlergiasMedicamento?.trim() || null,
      }));
    } catch (err) {
      console.error("Error obteniendo alergias:", err);
    }
  };

  // Un indicador se considera "no tomado" si viene null, "", 0 o 0.00
  const esIndicadorValido = (v: any) => {
    if (v === null || v === undefined || v === "") return false;
    const num = parseFloat(v);
    if (!isNaN(num) && num === 0) return false;
    return true;
  };

  // La columna de frecuencia cardiaca puede venir con distinta capitalización/ortografía según el origen del dato
  // (p.ej. frecuencia_cargada, frecuencia_cardiaca), así que se busca de forma tolerante en vez de una llave fija.
  const obtenerFrecuenciaCardiaca = (med: any) => {
    const key = Object.keys(med ?? {}).find(k => /frecuenc/i.test(k));
    return key ? med[key] : undefined;
  };

  // Arma la lista de indicadores a mostrar en la card, omitiendo los que no se tomaron (0, 0.00, "" o null)
  const indicadoresMedicion = (med: any) => {
    const items: { label: string; value: string; iconClass: string }[] = [];

    const sisValida = esIndicadorValido(med.presion_sistolica);
    const diaValida = esIndicadorValido(med.presion_diastolica);
    if (sisValida || diaValida) {
      items.push({
        label: "Presión arterial",
        value: `${sisValida ? med.presion_sistolica : "-"} / ${diaValida ? med.presion_diastolica : "-"} mmHg`,
        iconClass: "fa-solid fa-gauge-high",
      });
    }

    const frecuencia = obtenerFrecuenciaCardiaca(med);
    if (esIndicadorValido(frecuencia)) {
      items.push({ label: "Frecuencia cardiaca", value: `${frecuencia} lpm`, iconClass: "fa-solid fa-heart-pulse" });
    }

    if (esIndicadorValido(med.saturacion_oxigeno)) {
      items.push({ label: "Saturación de oxígeno", value: `${med.saturacion_oxigeno} %`, iconClass: "fa-solid fa-lungs" });
    }

    if (esIndicadorValido(med.nivel_glucosa)) {
      items.push({ label: "Nivel de glucosa", value: `${med.nivel_glucosa} mg/dL${esIndicadorValido(med.momento_glucosa) ? ` · ${med.momento_glucosa}` : ""}`, iconClass: "fa-solid fa-droplet" });
    }

    return items;
  };

  // Copia los valores detectados por Bluetooth a los inputs de Exploración Física y bloquea únicamente
  // los campos que sí trajeron un dato válido (los demás quedan libres para captura manual).
  const handleCargarResultados = () => {
    if (!medicionEquipo) return;

    const frecuencia = obtenerFrecuenciaCardiaca(medicionEquipo);
    const sisValida = esIndicadorValido(medicionEquipo.presion_sistolica);
    const diaValida = esIndicadorValido(medicionEquipo.presion_diastolica);
    const fcValida = esIndicadorValido(frecuencia);
    const spo2Valida = esIndicadorValido(medicionEquipo.saturacion_oxigeno);

    setVitalSigns(v => {
      const s = sisValida ? String(medicionEquipo.presion_sistolica) : v.Sistolica;
      const d = diaValida ? String(medicionEquipo.presion_diastolica) : v.Diastolica;
      const fc = fcValida ? String(frecuencia) : v.FC;
      const spo2 = spo2Valida ? String(medicionEquipo.saturacion_oxigeno) : v.SpO2;

      return {
        ...v,
        Sistolica: s,
        Diastolica: d,
        TA: `${s ? Math.round(parseFloat(s) / 10) : 0} / ${d ? Math.round(parseFloat(d) / 10) : 0}`,
        FC: fc,
        SpO2: spo2,
      };
    });

    setCamposCargados(c => ({
      sistolica: c.sistolica || sisValida,
      diastolica: c.diastolica || diaValida,
      fc: c.fc || fcValida,
      spo2: c.spo2 || spo2Valida,
    }));
  };

  // Verifica en [SCII_Mediciones_Equipo] si hay una medición reciente sin ligar para el usuario/paciente actual
  const checkMedicionEquipo = async (matriculaCurp: string) => {
    if (!user?.id || !matriculaCurp) return;

    try {
      const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMedicionEquipo`, {
        method: "POST",
        body: JSON.stringify({ idUsuario: user.id, matriculaCurp })
      });

      const res = await cons.json();
      const med = res?.ok ? res.data : null;

      if (med) {
        const firma = `${med.Fecha_medicion}`;
        if (medicionMostradaRef.current !== firma) {
          medicionMostradaRef.current = firma;
          setMedicionEquipo(med);
          setMedicionCargando(true);
          setTimeout(() => setMedicionCargando(false), 2000);
        }
      } else if (medicionMostradaRef.current) {
        medicionMostradaRef.current = null;
        setMedicionEquipo(null);
        setMedicionCargando(false);
      }
    } catch (err) {
      console.error("Error verificando medición de equipo:", err);
    }
  };

  // Normaliza texto (minúsculas, sin acentos) para comparar alergias contra el fármaco recetado
  const normalizarTexto = (s: string) =>
    s.normalize("NFD").split("").filter(ch => { const c = ch.charCodeAt(0); return c < 0x0300 || c > 0x036f; }).join("").toLowerCase().trim();

  const listaAlergias = (): string[] => {
    const raw = `${patientData.alergias ?? ""}, ${patientData.alergiasMedicamentos ?? ""}`;
    return raw.split(/[,;\n]|(?:\sy\s)/i).map(normalizarTexto).filter(s => s.length > 2);
  };

  // Coincidencia tipo "LIKE" entre el fármaco capturado y las alergias del paciente
  const medicamentoEsAlergeno = (nombreFarmaco: string): boolean => {
    const termino = normalizarTexto(nombreFarmaco);
    if (termino.length < 3) return false;
    return listaAlergias().some(a => termino.includes(a) || a.includes(termino));
  };

  const handleOpenExp  = (c: Consulta) => {
    setSelectedExp(c); setIsDetailOpen(true);
  };

  const handleCloseExp = () => {
    if (isDetailOpen) {
      if (isDetailFullscreen) {
        // Salir de pantalla completa primero y cerrar después: el ancho en pantalla
        // completa se calcula vía CSS (left/right), no admite transición animada hacia
        // un ancho fijo, así que se resuelve en dos pasos para que al menos el cierre
        // final (deslizar el panel hacia afuera) sí se vea animado.
        setIsDetailFullscreen(false);
        setTimeout(() => {
          setIsDetailOpen(false);
          setSelectedExp(null);
        }, 300);
      } else {
        setIsDetailOpen(false);
        setSelectedExp(null);
      }
    } else {
      setShowHistory(false);
    }
  };

  const handleDeleteConsulta = async (id: number) => {
    const result = await Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">¿Eliminar consulta?</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">Si confirma esta acción se <b>eliminará la consulta del historial</b> de forma permanente.</p>`,
      iconHtml: `
      <i class="fa-solid fa-question success-icon"></i>
      <style>
        .success-icon {
          color: #545454;
          font-size: 70px;
          animation: pop 0.4s ease-out forwards,
                     popPeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes popPeriodic {
          0%, 85%, 100% { transform: scale(1); }
          90% { transform: scale(1.15); }
          95% { transform: scale(0.95); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement;
        if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    });

    if (!result.isConfirmed) return;

    try {
      await fetchWithAuth(`${API_BASE_URL}/Consultas/EliminarConsulta`, {
        method: "POST",
        body: JSON.stringify({ id })
      });

      setHistoryData(prev => prev.filter(c => c.ID !== id));
      setIsDetailOpen(false);
      setSelectedExp(null);
      setShowHistory(false);
      exitoModal("Consulta eliminada", "Se ha eliminado la consulta del historial correctamente.");
    } catch (err) {
      console.error("Error al eliminar la consulta:", err);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);

    try {
      const payload = {
        TipoAtencion: formData.TipoAtencion || "Consulta General",
        ProtocoloAtencion: formData.ProtocoloAtencion || "",
        Procedimiento: formData.Procedimiento || "",
        PadecimientoActual: formData.PadecimientoActual || "",
        matricula: patientData.matricula || "",
        pacienteId: patientData.id ?? null,
        SignosVitales:
        {
          Peso: parseFloat(vitalSigns.Peso) || null,
          Talla: parseFloat(vitalSigns.Talla) || null,
          Abdomen: parseFloat(vitalSigns.Abdomen) || null,
          ICT: parseFloat(vitalSigns.ICT) || null,
          PA: vitalSigns.Sistolica + "/" + vitalSigns.Diastolica || null,
          TA: vitalSigns.TA || "",
          FC: parseInt(vitalSigns.FC) || null,
          FR: parseFloat(vitalSigns.FR) || null,
          SpO2: parseInt(vitalSigns.SpO2) || null,
          IMC: parseFloat(vitalSigns.IMC) || null
        },
        // Laboratorios:
        // {
        //   Colesterol: parseFloat(labs.colesterol) || null, 
        //   Trigliceridos: parseFloat(labs.trigliceridos) || null, 
        //   Glucosa: parseFloat(labs.glucosa) || null, 
        //   HbA1c: parseFloat(labs.hba1c) || null
        // }
      };

      const cons = await fetchWithAuth(`${API_BASE_URL}/AsistenteIA/ai-analyze`,
      {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await cons.json();

      if (res?.ok && res.data && res.data.riesgo) {
        setAiResult(res.data);
      } else {
        throw new Error();
      }
    } catch {
      setAiResult({
        riesgo: "Desconocido", 
        inconsistencias: ["La conexión con el Asistente IA falló."], 
        sugerenciasTratamiento: ["Revisa que el servidor esté en línea."], 
        diagnosticoDiferencial: ["Error de Red"]
      });
    }
    finally {
      setAnalyzing(false);
    }
  };

  const formatFechaAbrev = (fechaStr: string) => {
    const d = new Date(fechaStr);
    const dias  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
  };

  const confirmarYLigarCita = (cita: any) => {
    const fechaCita = formatFechaAbrev(cita.FechaCompleta);
    const horaCita  = `${cita.Hora} ${cita.Periodo}`;
    setCitaLigada({ id: cita.IdAgenda, fecha: fechaCita, hora: horaCita, motivo: cita.Motivo ?? "" });
  };

  const verificarCitaPendiente = async (matricula: string) => {
    try {
      const hoy = new Date();
      const inicio = hoy.toISOString().split("T")[0];
      const futuro = new Date(hoy);
      futuro.setMonth(futuro.getMonth() + 3);
      const final = futuro.toISOString().split("T")[0];

      const cons = await fetchWithAuth(`${API_BASE_URL}/Agenda/ObtenerCitas`, {
        method: "POST",
        body: JSON.stringify({ matricula, inicio, final })
      });

      const res = await cons.json();
      if (!res?.data?.length) return;

      const citasPendientes = res.data.filter((c: any) => {
        if (c.Estado !== "I") return false;

        const horaCita12 = parseInt(c.Hora);
        let horaCita24 = horaCita12;
        if (c.Periodo === "PM" && horaCita12 !== 12) horaCita24 = horaCita12 + 12;
        if (c.Periodo === "AM" && horaCita12 === 12) horaCita24 = 0;

        const fechaCita = new Date(c.FechaCompleta);
        const diaCita = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate());
        const diaHoy  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

        if (diaCita > diaHoy) return true;
        if (diaCita < diaHoy) return false;

        return horaCita24 >= hoy.getHours();
      });
      if (!citasPendientes.length) return;

      if (citasPendientes.length === 1) {
        const cita = citasPendientes[0];
        const fechaCita = formatFechaAbrev(cita.FechaCompleta);
        const horaCita  = `${cita.Hora} ${cita.Periodo}`;

        const result = await Swal.fire({
          title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Cita detectada</p>`,
          html: `<p style="font-size: 16px; padding: 0 40px">Se detectó una cita para el día <b>${fechaCita.toLowerCase()} a las ${horaCita}</b>. ¿Desea confirmar la asistencia?</p>`,
          iconHtml: `
          <i class="fa-solid fa-calendar-check success-icon"></i>
          <style>
            .success-icon {
              color: #545454;
              font-size: 70px;
              animation: pop 0.4s ease-out forwards,
                         popPeriodic 4s ease-in-out 1.5s infinite;
            }
            @keyframes pop {
              0% { transform: scale(0.5); opacity: 0; }
              70% { transform: scale(1.15); opacity: 1; }
              100% { transform: scale(1); }
            }
            @keyframes popPeriodic {
              0%, 85%, 100% { transform: scale(1); }
              90% { transform: scale(1.15); }
              95% { transform: scale(0.95); }
            }
          </style>
          `,
          didOpen: (p) => {
            const el = p.querySelector(".swal2-icon") as HTMLElement;
            if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
          },
          buttonsStyling: false,
          confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> Confirmar`,
          cancelButtonText: `<i class="fa-solid fa-xmark mr-1"></i> Ahora no`,
          showCancelButton: true,
          customClass: {
            confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
            cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
          },
        });

        if (result.isConfirmed) confirmarYLigarCita(cita);

      } else {
        const motivoLabel = (m: string) =>
          m === "IND" ? "Indicadores TNG sano" : m === "SEG" ? "Seguimiento" : m === "PER" ? "Periódico" : m || "";

        const opcionesHtml = citasPendientes.map((c: any) => {
          const fecha = formatFechaAbrev(c.FechaCompleta);
          const hora  = `${c.Hora} ${c.Periodo}`;
          const label = motivoLabel(c.Motivo ?? "");
          const notas = c.Notas ?? "";
          return `
            <div
              class="cita-card"
              data-id="${c.IdAgenda}"
              style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s; margin-bottom: 8px; text-align: left"
            >
              <input
                type="radio"
                name="citaSelect"
                value="${c.IdAgenda}"
                style="accent-color: #002E6D; width: 15px; height: 15px; cursor: pointer; flex-shrink: 0; pointer-events: none"
              />
              <div style="overflow:hidden;flex:1;min-width:0">
                <p class="text-[10px] text-gray-400 font-medium uppercase">
                  <strong>
                    ${fecha}, ${hora}
                  </strong>
                </p>
                <p title={docNombre} class="text-[11px] font-bold truncate uppercase text-gray-600">
                  ${label}
                </p>
                ${notas ? `<p class="text-[10px] text-gray-400 font-medium uppercase truncate">${notas}</p>` : ""}
              </div>
            </div>
          `;
        }).join("");

        const result = await Swal.fire({
          title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Citas detectadas</p>`,
          html: `<p style="font-size: 16px; padding: 0 40px">Se encontraron <b>${citasPendientes.length} citas pendientes</b>. Seleccione si desea confirmar la asistencia del paciente.</p>
                 <div class="mt-4" style="max-height: 260px; overflow-y: auto; padding:0 4px">${opcionesHtml}</div>`,
          iconHtml: `
            <i class="fa-solid fa-calendar-check success-icon"></i>
            <style>
              .success-icon {
                color: #545454;
                font-size: 70px;
                animation: pop 0.4s ease-out forwards,
                           popPeriodic 4s ease-in-out 1.5s infinite;
              }
              @keyframes pop {
                0% { transform: scale(0.5); opacity: 0; }
                70% { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(1); }
              }
              @keyframes popPeriodic {
                0%, 85%, 100% { transform: scale(1); }
                90% { transform: scale(1.15); }
                95% { transform: scale(0.95); }
              }
            </style>
          `,
          didOpen: (popup) => {
            const icon = popup.querySelector(".swal2-icon") as HTMLElement;
            if (icon) Object.assign(icon.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });

            const cards = popup.querySelectorAll<HTMLElement>(".cita-card");
            cards.forEach(card => {
              card.addEventListener("click", () => {
                const radio = card.querySelector<HTMLInputElement>("input[type='radio']");
                if (radio) radio.checked = true;
                cards.forEach(c => {
                  c.style.borderColor = "#e5e7eb";
                  c.style.background  = "";
                });
                card.style.borderColor = "#002e6d66";
                card.style.background  = "#002e6d0d";
              });
            });
          },
          buttonsStyling: false,
          confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> Confirmar`,
          denyButtonText: `<i class="fa-solid fa-xmark mr-1"></i> Ahora no`,
          showDenyButton: true,
          preConfirm: () => {
            const radio = document.querySelector<HTMLInputElement>('.swal2-popup input[name="citaSelect"]:checked');
            if (!radio?.value) { Swal.showValidationMessage('<i class="fa-solid fa-circle-info me-2"></i><span>Seleccione una cita para continuar.</span>'); return false; }
            return radio.value;
          },
          customClass: {
            confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
            denyButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
          },
        });

        if (result.isConfirmed && result.value) {
          // Comparar como string para evitar fallos por tipo (number vs string desde la API)
          const citaSeleccionada = citasPendientes.find((c: any) => String(c.IdAgenda) === String(result.value));
          if (citaSeleccionada) confirmarYLigarCita(citaSeleccionada);
        }
      }
    } catch (err) {
      console.error("Error al verificar cita:", err);
    }
  };

  const handleSaveConsult = async () => {
    const validations = [
      {
        condition: !pacienteExterno && !patientData.matricula?.trim(),
        message: "Debe ingresar una <b>matrícula o CURP</b> válida antes de levantar una consulta."
      },
      {
        condition: !patientData.nombre,
        message: "Debe ingresar el <b>nombre</b> del paciente."
      },
      {
        condition: !pacienteExterno && matriculaNotFound,
        message: "Debe ingresar una <b>matrícula</b> que se encuentre actualmente activa."
      },
      // {
      //   condition: patientData.estatus !== null && patientData.estatus !== "A",
      //   message: "Debe ingresar una <b>matrícula</b> que se encuentre actualmente activa."
      // },
      // {
      //   condition: !patientData.id,
      //   message: "Debe seleccionar un <b>paciente</b> para levantar una consulta."
      // },
      {
        condition: !formData.TipoAtencion || !formData.ProtocoloAtencion || !formData.PadecimientoActual,
        message: "Debe completar toda la información en el apartado de <b>datos de atención</b>."
      },
      {
        condition: !formData.Diagnostico || !formData.Recomendaciones,
        message: "Debe concluir el expediente con un <b>diagnóstico</b> y <b>recomendaciones</b>."
      },
      {
        condition: medicamentosReceta.some(m => !m.medicamento.trim()),
        message: "Los fármacos agregados deben tener el <b>nombre del medicamento</b>."
      },
      {
        condition: medicamentosReceta.some(m => m.medicamento.trim() && (!m.dosis.trim() || !m.frecuencia.trim() || !m.duracion.trim())),
        message: "Los fármacos agregados deben especificar la <b>dosis</b>, <b>frecuencia</b> y <b>duración</b>."
      },
    ];

    const error = validations.find(v => v.condition);

    if (error) {
      errorModal("Campos requeridos", error.message);

      return;
    }

    const farmacosAlergenos = medicamentosReceta
      .filter(m => m.medicamento.trim() && medicamentoEsAlergeno(m.medicamento))
      .map(m => m.medicamento.trim());

    if (farmacosAlergenos.length > 0) {
      const result = await Swal.fire({
        title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Alerta de fármaco</p>`,
        html: `<p style="font-size: 16px; padding: 0 40px">Se está prescribiendo <b class='uppercase'>${farmacosAlergenos.join(", ")}</b>, el cual se reportó como alergia del paciente.</p>`,
        iconHtml: `
        <i class="fa-solid fa-exclamation aviso-exclamation"></i>
        <style>
          .aviso-exclamation {
            font-size: 70px;
            animation: shakeInitial 0.6s ease-in-out,
                       shakePeriodic 4s ease-in-out 1.5s infinite;
          }
          @keyframes shakeInitial {
            0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
            20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
            40%  { transform: scale(1.05) rotate(10deg); }
            60%  { transform: scale(1.05) rotate(-7deg); }
            80%  { transform: scale(1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes shakePeriodic {
            0%, 85%, 100% { transform: rotate(0deg); }
            87% { transform: rotate(-10deg); }
            89% { transform: rotate(10deg); }
            91% { transform: rotate(-8deg); }
            93% { transform: rotate(8deg); }
            95% { transform: rotate(-4deg); }
            97% { transform: rotate(4deg); }
          }
        </style>
        `,
        didOpen: (p) => {
          const el = p.querySelector(".swal2-icon") as HTMLElement;
          if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" });
        },
        buttonsStyling: false,
        confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> Permitir`,
        cancelButtonText: `<i class="fa-solid fa-xmark mr-1"></i> Cancelar`,
        showCancelButton: true,
        customClass: {
          confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
          cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
        },
      });

      if (!result.isConfirmed) return;
    }

    try {
      setSaving(true);
      await new Promise(r => setTimeout(r, 2000));

      const res = await fetchWithAuth(`${API_BASE_URL}/Consultas/AgregarConsulta`,
        {
          method: "POST",
          body: JSON.stringify({ 
            expediente:
            {
              MedicoID: user?.id,
              PacienteID: patientData.id,
              IdAgenda: citaLigada?.id ?? null,
              Matricula: patientData.matricula,
              TipoPaciente: patientData.tipoPaciente,
              NombreExt: pacienteExterno ? patientData.nombre : "",
              Barco: pacienteExterno ? patientData.embarcacion : "",
              FechaConsulta: formData.FechaAtencion,
              TipoAtencion: formData.TipoAtencion,
              TipoEnfermedad: formData.TipoEnfermedad || "",
              PrimerosAux: formData.TipoEnfermedad || "",
              ProtocoloAtencion: formData.ProtocoloAtencion,
              Procedimiento: formData.Procedimiento || "",
              PadecimientoActual: formData.PadecimientoActual,
              ExploracionFisica: 
              {
                Peso: parseFloat(vitalSigns.Peso), 
                Talla: parseFloat(vitalSigns.Talla), 
                IMC: parseFloat(vitalSigns.IMC), 
                Abdomen: parseFloat(vitalSigns.Abdomen), 
                ICT: parseFloat(vitalSigns.ICT),
                SpO2: parseFloat(vitalSigns.SpO2), 
                PA: `${vitalSigns.Sistolica} / ${vitalSigns.Diastolica}`, 
                TA: vitalSigns.TA, 
                FC: vitalSigns.FC, 
                FR: vitalSigns.FR
              }, 
              Diagnostico: formData.Diagnostico, 
              Recomendaciones: formData.Recomendaciones, 
              // RecetaMedica: formData.RecetaMedica || "", 
              RecetaEstructurada: medicamentosReceta
            }
          })
        });

      let data: any = null;

      try { data = await res.json(); } catch { data = null; }

      if (data) {
        // Si hay una cita ligada, actualizar Estado a "A" y asignar el ConsultaId
        if (citaLigada?.id) {
          const consultaId = data?.ID ?? data?.id ?? data?.consultaId ?? null;
          try {
            await fetchWithAuth(`${API_BASE_URL}/Agenda/ConfirmaCita`, {
              method: "POST",
              body: JSON.stringify({
                idAgenda: citaLigada.id,
                esActivo: "A",
                consultaId,
              })
            });
          } catch (err) {
            console.error("Error al actualizar la cita ligada:", err);
          }
        }

        exitoModal("Éxito al guardar", "Se han registrado los datos de la consulta correctamente.");

        setShowHistory(false);
        setIsDetailOpen(false);
        setSelectedExp(null);
        setCitaLigada(null);
        setFormData({ FechaAtencion: toDatetimeLocal(new Date()), TipoAtencion: "", TipoEnfermedad: "", ProtocoloAtencion: "", Procedimiento: "", PadecimientoActual: "", Diagnostico: "", Recomendaciones: "", RecetaMedica: "" });
        setVitalSigns({ Peso: "", Talla: "", IMC: "", Abdomen: "", ICT: "", Sistolica: "", Diastolica: "", TA: "", FC: "", FR: "", SpO2: "" });
        setMedicamentosReceta([]);
        setAiResult(null);
        setAnalyzing(false);
      }
    } catch (err) {
      console.error('Error: ', err);
    }
    finally {
      setSaving(false);
    }
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-check success-icon"></i>
      <style>
        .success-icon {
          color: #545454;
          font-size: 70px;
          animation: pop 0.4s ease-out forwards,
                     popPeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes popPeriodic {
          0%, 85%, 100% { transform: scale(1); }
          90% { transform: scale(1.15); }
          95% { transform: scale(0.95); }
        }
      </style>
      `,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false, 
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass:
      { 
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    })
  };

  const errorModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-exclamation aviso-exclamation"></i>
      <style>
        .aviso-exclamation {
          font-size: 70px;
          animation: shakeInitial 0.6s ease-in-out,
                     shakePeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes shakeInitial {
          0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
          40%  { transform: scale(1.05) rotate(10deg); }
          60%  { transform: scale(1.05) rotate(-7deg); }
          80%  { transform: scale(1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shakePeriodic {
          0%, 85%, 100% { transform: rotate(0deg); }
          87% { transform: rotate(-10deg); }
          89% { transform: rotate(10deg); }
          91% { transform: rotate(-8deg); }
          93% { transform: rotate(8deg); }
          95% { transform: rotate(-4deg); }
          97% { transform: rotate(4deg); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false, 
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass:
      {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    });
  };

  useEffect(() => {
    const val = patientData.matricula?.trim() ?? "";
    if (!val) return;

    const isMatricula = val.length >= 1 && val.length <= 5;
    const isCurp = val.length >= 16 || (val.length >= 6 && val.length <= 9);
    if (!isMatricula && !isCurp) return;

    const delay = setTimeout(() => {
      (async () => {
        try {
          setLoadingMat(true);
          checkMedicionEquipo(val);
          await new Promise(r => setTimeout(r, 1000));

          // let res: any[] | null = null;

          if (isMatricula) {
            const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMatricula`, {
              method: "POST",
              body: JSON.stringify({ matricula: val })
            });

            const res = await cons.json();
            const found = res?.ok && Array.isArray(res.data) && res.data.length > 0;

            if (found) {
              setMatriculaNotFound(false);
              setPatientData(p => ({ ...p, id: res.data[0].IdPaciente, nombre: res.data[0].Nombre, especialidad: res.data[0].Especialidad, estatus: res.data[0].Empl_status, tipoPaciente: "I" }));
              setMatriculaNotRegis(res.data[0].IdPaciente == null);
              if (res.data[0].IdPaciente != null) verificarCitaPendiente(val);
              fetchAlergias(res.data[0].IdPaciente, val);
            } else {
              setMatriculaNotFound(true);
              setMatriculaNotRegis(false);
              setPatientData(p => ({ ...p, id: null, nombre: "", especialidad: "", estatus: "", tipoPaciente: null, alergias: null, alergiasMedicamentos: null }));
            }
          } else {
            const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarProveedor`, {
              method: "POST",
              body: JSON.stringify({ curp: val })
            });

            const res = await cons.json();
            const found = res?.ok && Array.isArray(res.data) && res.data.length > 0;

            if (found) {
              setMatriculaNotFound(false);
              setMatriculaNotRegis(res.data[0].IdPaciente == null);
              setPatientData(p => ({ ...p, id: res.data[0].IdPaciente, nombre: res.data[0].Nombre, especialidad: res.data[0].Especialidad, estatus: null, tipoPaciente: res.data[0].TipoPaciente }));
              if (res.data[0].IdPaciente != null) verificarCitaPendiente(val);
              fetchAlergias(res.data[0].IdPaciente, val);
            } else {
              setMatriculaNotFound(true);
              setMatriculaNotRegis(false);
              setPatientData(p => ({ ...p, id: null, nombre: "", especialidad: "", estatus: "", tipoPaciente: null, alergias: null, alergiasMedicamentos: null }));
            }
          }
        } catch (err) {
          console.error("Error cargando citas:", err);
        } finally {
          setLoadingMat(false);
        }
      })();
    }, 1000);
    return () => clearTimeout(delay);
  }, [patientData.matricula]);

  // Mientras la sesión esté abierta en esta pantalla y haya una matrícula/CURP válida capturada,
  // se sondea periódicamente [SCII_Mediciones_Equipo] en busca de mediciones de equipo sin ligar.
  useEffect(() => {
    const val = patientData.matricula?.trim() ?? "";
    if (!val) return;

    const isMatricula = val.length >= 1 && val.length <= 5;
    const isCurp = val.length >= 16 || (val.length >= 6 && val.length <= 9);
    if (!isMatricula && !isCurp) return;

    const interval = setInterval(() => {
      checkMedicionEquipo(val);
    }, 20000);

    return () => clearInterval(interval);
  }, [patientData.matricula, user?.id]);

  const getImcInput = (imc: string) => {
    const v = parseFloat(imc);
    
    if (!imc || isNaN(v) || v === 0) return "border-gray-50 bg-gray-100 text-gray-700";
    if (v < 18.5) return "border-yellow-300/20 bg-yellow-50 text-yellow-500";
    if (v <= 24.9) return "border-horz-blue/20 bg-blue-50 text-sky-blue";
    if (v <= 29.9) return "border-yellow-300/20 bg-yellow-50 text-yellow-500";
    return "border-red-200/20 bg-red-50 text-red-500";
  };

  const getImcIcon  = (imc: string) => {
    const v = parseFloat(imc);

    if (!imc || isNaN(v) || v === 0) return "text-gray-400";
    if (v < 18.5) return "text-yellow-500";
    if (v <= 24.9) return "text-sky-blue";
    if (v <= 29.9) return "text-yellow-500";
    return "text-red-500";
  };

  const getIctInput = (ict: string) => {
    const v = parseFloat(ict);

    if (!ict || isNaN(v) || v === 0) return "border-gray-50 bg-gray-100 text-gray-700";
    if (v < 0.5) return "border-horz-blue/20 bg-blue-50 text-sky-blue";
    if (v < 0.6) return "border-yellow-300/20 bg-yellow-50 text-yellow-500";
    return "border-red-200/20 bg-red-50 text-red-500";
  };

  const getIctIcon = (ict: string) => {
    const v = parseFloat(ict);

    if (!ict || isNaN(v) || v === 0) return "text-gray-400";
    if (v < 0.5) return "text-sky-blue";
    if (v < 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const subtiposAtencion: Record<string, string[]> = {
    "1": [
      "Aplicación de medicamentos",
      "Chequeo de signos vitales",
      "Curaciones",
      "Retiro de puntos",
    ],
    "2": [
      "Llamado de auxilio",
      "Traslado IMSS",
      "Valoración y atención en área",
    ],
    "3": [
      "Dermatitis",
      "Dermatitis por contacto",
      "Escabiasis",
      "Heridas",
      "Micosis",
      "Sarpullido",
      "Quemadura",
      "Quiste pilonidal",
      "Otras",
    ],
    "4": [
      "Cistitis",
      "Insuficiencia renal",
      "Incontinencia urinaria",
      "IVU",
      "Litiasis renal",
      "Prostatitis",
      "Uretritis",
      "Otras",
    ],
    "5": [
      "Apendicitis",
      "Enfermedad diverticular",
      "ERGE y dispepsia",
      "Estreñimiento",
      "Gastritis y úlceras pépticas",
      "Gastroenteritis",
      "Hemorroides",
      "SII",
      "Otras",
    ],
    "6": [
      "Asma",
      "Bronquitis",
      "COVID-19",
      "EPOC",
      "Faringitis",
      "Influenza",
      "Neumonia",
      "Resfriado",
      "Rinitis alérgica",
      "Tuberculosis",
      "Otras",
    ],
    "7": [
      "Angina",
      "Arritmia",
      "EVC",
      "Hipertensión arterial",
      "Infarto",
      "Síncope",
      "Taquicardia o bradicardia",
      "Otras",
    ],
    "8": [
      "Diabetes",
      "Obesidad",
      "Pancreatitis metabólica",
      "Trastornos de paratiroides",
      "Trastornos hipofisarios",
      "Trastornos suprarrenales",
      "Trastornos tiroideos",
      "Otras",
    ],
    "9": [
      "Herpes (zoster, 6 y 7)",
      "Roseola",
      "Rubeola",
      "Sarampión",
      "Varicela",
      "Otras",
    ],
    "10": [
      "Artritis reumatoide",
      "Enfermedad inflamatoria intestinal",
      "Esclerosis",
      "Lupus",
      "Psoriasis",
      "Tiroiditis",
      "Trastornos de hipersensibilidad",
      "Otras",
    ],
    "11": [
      "Chagas",
      "Chikungunya",
      "Dengue",
      "Paludismo",
      "Rickettsiosis",
      "Zika",
      "Otras",
    ],
    "12": [
      "Clamidia",
      "Gonorrea",
      "Herpes",
      "Sífilis",
      "VIH",
      "VPH",
      "Otras",
    ],
    "13": [
      "Amenorrea",
      "Complicaciones de embarazo",
      "Dismenorrea",
      "Embarazo",
      "Endometriosis",
      "Hipermenorrea",
      "Miomatosis",
      "SOP",
      "SUA",
      "Otras",
    ],
    "14": [
      "Artralgia",
      "Artropatia",
      "Artrosis",
      "Contractura",
      "Contusión",
      "Esguince",
      "Fractura",
      "Lesiones columna (cervicalgia, dorsalgia, lumbalgia)",
      "Lesiones tendinosas",
      "Luxación",
      "Traumatismos",
    ],
    "15": [
      "Absceso periapical",
      "Bruxismo",
      "Caries",
      "Enfermedad periodontal",
      "Halitosis",
      "Odontalgia",
      "Otras",
    ],
    "16": [
      "Blefaritis",
      "CEEO",
      "Conjuntivitis",
      "Irritación",
      "Orzuelo o chalazión",
      "Polvo",
      "Quemadura corneal",
      "Uveítis",
      "Otras",
    ],
    // "17": [

    // ],
    "18": [
      "Coleastoma",
      "Enfermedad de Ménière",
      "Perforación timpánica",
      "Otitis (externa, media, interna)",
      "Otocerosis",
      "Otoesclerosis",
      "Vértigo periférico",
      "VPPB",
      "Otras",
    ],
    "19": [
      "Ansiedad",
      "Depresión",
      "Esquizofrenia",
      "Trastorno del sueño",
      "Otras",
    ],
    "20": [
      "Cefalea o migraña",
      "Enfermedades neurodegenerativas",
      "Epilepsia",
      "Parálisis",
      "Vertigo central",
      "Otras",
    ],
    "21": [
      "Cirrosis",
      "Colecistitis",
      "Colelitiasis",
      "Hepatitis no viral",
      "Hepatitis viral",
      "Pancreatitis",
      "Otras",
    ],
    "22": [
      "Agotamiento por calor",
      "Espasmos por calor",
      "Golpe de calor",
      "Síncope por calor",
      "Otras",
    ],
  };

  const protocoloHabilitado = formData.TipoAtencion === "EFG" || (formData.TipoAtencion === "AUX" && !!formData.TipoEnfermedad);
  const matriculaValida = pacienteExterno || (!!patientData.matricula?.trim() && !!patientData.nombre && !matriculaNotFound);
  const requiereProcedimiento = formData.ProtocoloAtencion !== "17" && subtiposAtencion[formData.ProtocoloAtencion]?.length > 0;
  const datosAtencionCompletos = !!formData.ProtocoloAtencion && (!requiereProcedimiento || !!formData.Procedimiento);

  // const protocolos: Record<number,string> = {
  //   1: "Resfriado común, faringitis, faringoamigdalistis, COVID-19.", 
  //   2: "Cólicos, diarrea, GEPI, nauseas, vómito, odontalgía.", 
  //   3: "Disuria, coluria, cólico renal, poliuria, pielonefritis, hidronefrosis, IVU, cistitis, uretritis, VPH, VIH.", 
  //   4: "Taquicardia, bradicardia, arritmias, urgencia o emergencia hipertensiva, EVC, infarto, angina.", 
  //   5: "CCE, conjuntivitis, orzuelo.", 
  //   6: "Contusión, esguince, luxación, FX, dorsalgia, lumbalgia, tendinitis, artropatías.", 
  //   7: "Cefalea, parálisis, migraña, vértigo, epilepsia, neurodegenerativo.",
  //   8: "Intento de suicidio, psicosis, conducta agresiva, crisis de angustia, estrés postraumático.", 
  //   9: "Dislipidemia, glucosa, DM2, pie diabético, neuropatía, tiroides, EVC.", 
  //   10: "Curación, aplicaciones, retiro de puntos, monitoreo PA.", 
  //   11: "CE oído, otitis, otalgia.", 
  //   12: "Síndrome febril, golpe de calor.", 
  //   13: "Llamado auxilio, valoración y atención en área, traslado IMSS.", 
  //   14: "", 
  //   15: "Dermatitis, abscesos, quistes sebáceos, quemaduras, heridas, suturas.", 
  //   16: ""
  // };

  return (
    <div className="relative flex w-full">
      <div
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
        style={{ marginRight: showHistory ? 300 : 0 }}
      >
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-50 shadow-xs gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Consulta Médica
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Levantamiento de consulta y análisis inteligente.
              </p>
            </div>
            <button
              onClick={handleSaveConsult}
              disabled={saving || loadingMat || !matriculaValida}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-60 disabled:cursor-default disabled:hover:-translate-y-0 disabled:hover:from-sea-blue disabled:hover:to-sky-blue hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i></>
                : <><i className="fa-solid fa-plus mr-2"></i></>
              }
              Guardar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              {citaLigada && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  // className="flex items-center bg-blue-50 border border-horz-blue rounded-xl shadow-sm px-4 py-3 gap-3"
                  className={`relative overflow-hidden flex items-center bg-gradient-to-b from-blue-50 to-white rounded-xl border border-gray-50 shadow-xs px-4 py-3 gap-3`}
                  // sticky top-55 z-1
                >
                  <ShimmerOverlay subtle />
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-blue/10 shrink-0">
                    <i className="fa-solid fa-calendar-check text-sea-blue text-xs"></i>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-sea-blue uppercase tracking-wide">
                      Cita ligada a esta consulta
                    </p>
                    {/* "block text-xs font-medium text-gray-700 mb-1 */}
                    <p className="text-[10px] text-gray-400 font-medium uppercase">
                      {/* text-[10px] text-gray-400 font-medium uppercase */}
                      <span className="font-medium uppercase">
                        {citaLigada.fecha}, {citaLigada.hora}
                      </span>
                      {citaLigada.motivo && (
                        <>
                          {/* <span>·</span> */}
                          <i className="fa-solid fa-circle text-[3px] align-middle px-1"></i>
                          {citaLigada.motivo ? citaLigada.motivo == "IND" ? "Indicadores TNG sano" : citaLigada.motivo == "SEG" ? "Seguimiento" : citaLigada.motivo == "PER" ? "Periódico" : "" : ""}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    title="Desligar Cita"
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                    onClick={() => setCitaLigada(null)}
                  >
                    <i className="fa-solid fa-xmark text-lg"></i>
                  </button>
                </motion.div>
              )}

              {(patientData.alergias || patientData.alergiasMedicamentos) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  // className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start shadow-sm"
                  className={`relative overflow-hidden flex items-center bg-gradient-to-b from-yellow-50 to-white rounded-xl border border-gray-50 shadow-xs px-4 py-3 gap-3`}
                >
                  <ShimmerOverlay subtle />
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 shrink-0">
                    <i className="fa-solid fa-triangle-exclamation text-yellow-800 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                      Alerta de Farmacovigilancia
                    </p>
                    <p className="text-[10px] text-yellow-700 font-medium uppercase">
                    {patientData.alergias && (
                      <span className="font-medium uppercase">
                        Alergias: <strong>{patientData.alergias}</strong>
                      </span>
                    )}
                    {patientData.alergias && patientData.alergiasMedicamentos && <i className="fa-solid fa-circle text-[3px] align-middle px-1"></i>}
                    {patientData.alergiasMedicamentos && (
                      <>
                        Alergias a medicamentos: <strong>{patientData.alergiasMedicamentos}</strong>
                      </>
                    )}
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`bg-white rounded-xl border border-gray-50 shadow-xs p-6`}
              >
                <div className="mb-4 relative flex items-center">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="fa-solid fa-user text-sea-blue mr-3"></i>
                    Datos del Paciente
                  </h2>
                  
                  {!matriculaNotFound && patientData.nombre && (patientData.estatus === "A" || (patientData.tipoPaciente === "E" && patientData.id != null)) && (
                    <button
                      onClick={() => {
                        if (showHistory) {
                          setShowHistory(false);
                          handleCloseExp();
                        } else {
                          setShowHistory(true);
                          fetchHistory(patientData.tipoPaciente, patientData.id ?? patientData.matricula);
                        }
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-[55%] text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="fa-solid fa-clock-rotate-left mr-2"></i>
                      Ver Historial
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Matrícula / CURP
                    </label>
                    <div className="relative">
                      <i className={`fa-solid fa-magnifying-glass text-xs absolute left-3 top-2.5 ${!patientData.matricula ? "text-gray-400" : loadingMat ? "text-gray-400" : matriculaNotFound ? "text-red-500" : "text-gray-400"}`}></i>
                      <input
                        type="text"
                        value={patientData.matricula ?? ""}
                        onChange={handleSearchPatient}
                        placeholder="Buscar por matrícula o CURP"
                        // disabled={loadingMat}
                        disabled={loadingMat || pacienteExterno}
                        maxLength={18}
                        className={`w-full border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none shadow-xs transition-colors ${pacienteExterno ? "border-gray-50 bg-gray-100 text-gray-400 cursor-not-allowed" : !patientData.matricula ? "border-gray-50 bg-white focus:ring-1 focus:ring-sea-blue" : loadingMat ? "border-gray-50 bg-gray-100" : matriculaNotFound ? "border-red-200 bg-red-50 text-red-500 focus:ring-0" : "border-gray-50 bg-white focus:ring-1 focus:ring-sea-blue"}`}
                      />
                      {loadingMat && (
                        <div className="absolute right-3 top-[10px] -translate-y-1/4">
                          <i className="fa-solid fa-spinner fa-spin text-gray-400 text-lg"></i>
                        </div>
                      )}
                      <div className="flex items-center mt-2 gap-2">
                        <CkCell
                          checked={pacienteExterno}
                          onChange={(checked) => {
                            setPacienteExterno(checked ?? false);
                            if (checked) {
                              setPatientData(p => ({ ...p, matricula: "", nombre: "", embarcacion: "", tipoPaciente: "E" }));
                            } else {
                              setPatientData(p => ({ ...p, nombre: "", embarcacion: "", especialidad: "", tipoPaciente: null }));
                            }
                            medicionMostradaRef.current = null;
                            setMedicionEquipo(null);
                            setMedicionCargando(false);
                            setCamposCargados({ sistolica: false, diastolica: false, fc: false, spo2: false });
                          }}
                        />
                        <label
                          onClick={() => {
                            const newState = !pacienteExterno;
                            setPacienteExterno(newState);
                            if (newState) {
                              setPatientData(p => ({ ...p, matricula: "", nombre: "", embarcacion: "", tipoPaciente: "E" }));
                            } else {
                              setPatientData(p => ({ ...p, nombre: "", embarcacion: "", especialidad: "", tipoPaciente: null }));
                            }
                            medicionMostradaRef.current = null;
                            setMedicionEquipo(null);
                            setMedicionCargando(false);
                            setCamposCargados({ sistolica: false, diastolica: false, fc: false, spo2: false });
                          }}
                          className="text-xs text-gray-700 font-medium cursor-pointer">
                          Extranjero
                        </label>
                      </div>
                    </div>
                    {/* {(matriculaNotRegis || matriculaNotFound) && (
                      <p className={`text-xs mt-1 ${matriculaNotRegis ? "text-yellow-500" : "text-red-500"}`}>
                        {matriculaNotRegis ? "La matrícula se encuentra activa, pero sin alta en sistema." : "No se encontró ningún paciente con esa matrícula / CURP."}
                      </p>
                    )} */}
                    {(matriculaNotFound) && (
                      <p className={`text-xs mt-1 text-red-500`}>
                        No se encontró ningún paciente con esa matrícula / CURP.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha y hora de atención
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.FechaAtencion}
                      onChange={(e) => setFormData(f => ({ ...f, FechaAtencion: e.target.value }))}
                      className="w-full bg-white border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={patientData.nombre}
                      onChange={(e) => setPatientData(p => ({ ...p, nombre: e.target.value })) }
                      disabled={!pacienteExterno}
                      placeholder="Nombre del paciente"
                      className={`w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs font-medium outline-none ${ pacienteExterno ? "bg-white text-gray-800" : "bg-gray-100 text-gray-800" }`}
                    />
                  </div>
                  {pacienteExterno ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Embarcación
                      </label>
                      <input
                        type="text"
                        value={patientData.embarcacion}
                        onChange={(e) => setPatientData(p => ({ ...p, embarcacion: e.target.value }))}
                        placeholder="Embarcación"
                        className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-white text-gray-800 font-medium outline-none focus:ring-1 focus:ring-sea-blue"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Especialidad
                      </label>
                      <input
                        type="text"
                        value={patientData.especialidad}
                        disabled
                        placeholder="Especialidad"
                        className="w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-gray-100 text-gray-800 font-medium outline-none"
                      />
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={`bg-white rounded-xl border border-gray-50 shadow-xs p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <i className="fa-solid fa-comment-medical text-sea-blue mr-3"></i>
                  Datos de Atención
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={formData.TipoAtencion === "AUX" ? "" : "md:col-span-2"}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo de atención
                    </label>
                    <select
                      className="w-full bg-white border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      value={formData.TipoAtencion}
                      onChange={(e) => setFormData(f => ({ ...f, TipoAtencion: e.target.value }))}
                    >
                      <option value="" disabled hidden>Seleccionar</option>
                      <option value="AUX">Primeros auxilios</option>
                      <option value="EFG">Enfermedad general</option>
                      {/* <option value="IND">Indicadores TNG sano</option> */}
                    </select>
                  </div>
                  {formData.TipoAtencion === "AUX" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Atención por primeros auxilios
                      </label>
                      <select
                        className={`w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none ${!formData.TipoAtencion ? "bg-gray-100 text-gray-800 cursor-not-allowed" : "bg-white"}`}
                        value={formData.TipoEnfermedad || ""}
                        onChange={(e) => setFormData(f => ({ ...f,TipoEnfermedad: e.target.value }))}
                        disabled={!formData.TipoAtencion}
                      >
                        <option value="" disabled hidden>Seleccionar</option>
                        <option value="1">Accidente de trabajo</option>
                        <option value="2">Accidente de trayecto</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className={subtiposAtencion[formData.ProtocoloAtencion]?.length > 0 ? "" : "md:col-span-2"}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Protocolo de atención
                    </label>
                    <select
                      className={`w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none ${!protocoloHabilitado ? "bg-gray-100 text-gray-800 cursor-not-allowed" : "bg-white"}`}
                      value={formData.ProtocoloAtencion || ""}
                      onChange={(e) => setFormData(f => ({ ...f, ProtocoloAtencion: e.target.value, Procedimiento: "" }))}
                      disabled={!protocoloHabilitado}
                    >
                      <option value="" disabled hidden>Seleccionar</option>
                      <option value="1">Acción de enfermería</option>
                      <option value="2">Acción de TUM</option>
                      <option value="3">Dermatología</option>
                      <option value="4">Enfermedad del tracto urinario</option>
                      <option value="5">Enfermedad gastrointestinal</option>
                      <option value="6">Enfermedad respiratoria</option>
                      <option value="7">Enfermedades cardiovasculares</option>
                      <option value="8">Enfermedades endocrinas</option>
                      <option value="9">Enfermedades exantemáticas</option>
                      <option value="10">Enfermedades inmunológicas</option>
                      <option value="11">Enfermedades por vectores</option>
                      <option value="12">ETS</option>
                      <option value="13">Gineco-obstétrico</option>
                      <option value="14">Músculo esquelético</option>
                      <option value="15">Odontológico</option>
                      <option value="16">Oftalmología</option>
                      <option value="17">Oncológicas</option>
                      <option value="18">Ótico</option>
                      <option value="19">Psicológico / psiquiátrico</option>
                      <option value="20">SNC</option>
                      <option value="21">Trastornos del hígado y vías biliares</option>
                      <option value="22">Trastornos por altas temperaturas</option>
                    </select>
                    {/* <p className="text-xs text-gray-400 mt-1">
                      {protocolos[Number(formData.ProtocoloAtencion)] || "Selecciona un protocolo para ver la descripción."}
                    </p> */}
                  </div>
                  {formData.ProtocoloAtencion !== "17" && subtiposAtencion[formData.ProtocoloAtencion]?.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Procedimiento realizado
                      </label>
                      <select
                        className={`w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none ${!protocoloHabilitado ? "bg-gray-100 text-gray-800 cursor-not-allowed" : "bg-white"}`}
                        value={formData.Procedimiento}
                        onChange={(e) => setFormData(f => ({ ...f, Procedimiento: e.target.value }))}
                        disabled={!protocoloHabilitado}
                      >
                        <option value="" disabled hidden>Seleccionar</option>
                        {subtiposAtencion[formData.ProtocoloAtencion].map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Padecimiento actual
                  </label>
                  <textarea
                    rows={2}
                    value={formData.PadecimientoActual}
                    onChange={(e) => setFormData(f => ({ ...f,PadecimientoActual:e.target.value }))}
                    disabled={!datosAtencionCompletos}
                    className={`w-full p-2.5 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none resize-none ${!datosAtencionCompletos ? "bg-gray-100 text-gray-800 cursor-not-allowed" : "bg-white"}`}
                    placeholder="Descripción del padecimiento"
                  />
                </div>
                {/* Oculto temporalmente: Revisión física */}
                {/* <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Revisión física
                  </label>
                  <textarea
                    rows={2}
                    // value={formData.PadecimientoActual}
                    // onChange={(e) => setFormData(f => ({ ...f,PadecimientoActual:e.target.value }))}
                    disabled={!datosAtencionCompletos}
                    className={`w-full p-2.5 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none resize-none ${!datosAtencionCompletos ? "bg-gray-100 text-gray-800 cursor-not-allowed" : "bg-white"}`}
                    placeholder="Resultado de la exploración"
                  />
                </div> */}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`bg-white rounded-xl border border-gray-50 shadow-xs p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <i className="fa-solid fa-person text-sea-blue mr-3"></i>
                  Exploración Física
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-weight-scale text-xs absolute left-3 top-2.5 text-gray-400"></i>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={vitalSigns.Peso}
                        onChange={(e) => { if(e.target.value.length > 6) return; handleMeasureChange("Peso",e.target.value); }}
                        className="w-full p-2 pl-9 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">kg</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Peso en kilogramos
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Altura (m)
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-ruler-vertical text-xs absolute left-3 top-2.5 text-gray-400"></i>
                      <input
                        type="number" 
                        step="0.01" 
                        value={vitalSigns.Talla} 
                        onChange={(e) => { if(e.target.value.length > 4) return; handleMeasureChange("Talla",e.target.value); }}
                        className="w-full p-2 pl-9 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00" 
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">m</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Altura en metros
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IMC</label>
                    <div className="relative flex items-center">
                      <i className={`fa-solid fa-scale-balanced text-xs absolute left-3 top-2.5 pointer-events-none transition-colors ${getImcIcon(vitalSigns.IMC)}`}></i>
                      <input 
                        type="text" 
                        value={vitalSigns.IMC} 
                        disabled 
                        className={`w-full px-3 py-2 pl-9 rounded-lg border text-xs shadow-xs outline-none transition-colors ${getImcInput(vitalSigns.IMC)}`}
                        placeholder="0.00"
                      />
                    </div>
                    {/* <p className="text-xs text-gray-400 mt-1">
                      Índice de masa corporal
                    </p> */}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PA (cm)
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-ruler-horizontal text-xs absolute left-3 top-2.5 text-gray-400"></i>
                      <input
                        type="text"
                        value={vitalSigns.Abdomen}
                        onChange={(e) => { const val = e.target.value; if(val.length > 6) return; setVitalSigns(v => ({ ...v, Abdomen: val, ICT: calcICT(val, v.Talla) })); }}
                        className="w-full px-3 py-2 pl-9 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">cm</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Perímetro abdominal
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ICT</label>
                    <div className="relative flex items-center">
                      <i className={`fa-solid fa-dumbbell text-xs absolute left-3 top-2.5 pointer-events-none transition-colors ${getIctIcon(vitalSigns.ICT)}`}></i><input
                        type="text"
                        value={vitalSigns.ICT}
                        disabled
                        className={`w-full px-3 py-2 pl-9 rounded-lg border text-xs shadow-xs outline-none transition-colors ${getIctInput(vitalSigns.ICT)}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      T/A (mmHg)
                    </label>
                    <div className={`relative flex items-center border shadow-xs rounded-lg focus-within:ring-1 focus-within:ring-clinical-blue focus-within:border-clinical-blue ${(camposCargados.sistolica || camposCargados.diastolica) ? "bg-gray-100 border-gray-50" : "bg-white border-gray-50"}`}>
                      <i className="fa-solid fa-gauge-high text-xs absolute left-3 text-gray-400 pointer-events-none z-10"></i>
                      <div className="flex items-center w-full pl-9 pr-2 py-2">
                        <input
                          ref={sistolicaRef}
                          type="number"
                          value={vitalSigns.Sistolica}
                          disabled={camposCargados.sistolica}
                          onChange={(e) => {
                            const r = e.target.value;
                            if (r.length > 3) return;
                            const s = r, d = vitalSigns.Diastolica;
                            setVitalSigns(v => ({ ...v, Sistolica: s, PA: `${s} / ${d}`, TA: `${s ? Math.round(parseFloat(s) / 10) : 0} / ${d ? Math.round(parseFloat(d) / 10) : 0}` }));
                            if (r.length === 3) diastolicaRef.current?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "/" || e.key === "-") {
                              e.preventDefault();
                              diastolicaRef.current?.focus();
                            }
                          }}
                          className={`w-6 text-xs outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${camposCargados.sistolica ? "text-gray-400 cursor-not-allowed" : ""}`}
                          placeholder="120"
                        />
                        <span className="text-gray-400 font-medium text-xs px-1">/</span>
                        <input
                          ref={diastolicaRef}
                          type="number"
                          value={vitalSigns.Diastolica}
                          disabled={camposCargados.diastolica}
                          onChange={(e) => {
                            const r = e.target.value;
                            if (r.length > 3) return;
                            const d = r, s = vitalSigns.Sistolica;
                            setVitalSigns(v => ({ ...v, Diastolica: d, PA: `${s} / ${d}`, TA: `${s ? Math.round(parseFloat(s) / 10) : 0} / ${d ? Math.round(parseFloat(d) / 10) : 0}` }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && vitalSigns.Diastolica === "") {
                              e.preventDefault();
                              sistolicaRef.current?.focus();
                              const s = vitalSigns.Sistolica;
                              if (s.length > 0) {
                                const newS = s.slice(0, -1);
                                const d = vitalSigns.Diastolica;
                                setVitalSigns(v => ({ ...v, Sistolica: newS, PA: `${newS} / ${d}`, TA: `${newS ? Math.round(parseFloat(newS) / 10) : 0} / ${d ? Math.round(parseFloat(d) / 10) : 0}` }));
                              }
                            }
                          }}
                          className={`w-6 text-xs outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${camposCargados.diastolica ? "text-gray-400 cursor-not-allowed" : ""}`}
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Tensión arterial
                    </p>
                  </div>
                  <div className="hidden">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      T/A
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-wave-square text-xs absolute left-3 text-gray-400 pointer-events-none z-10"></i>
                      <input 
                        type="text" 
                        value={vitalSigns.TA} 
                        disabled 
                        className="w-full px-3 py-2 pl-9 border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-700 font-medium outline-none"
                        placeholder="12 / 8"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Tensión arterial
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      FC (lpm)
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-heart-pulse text-xs absolute left-3 top-2.5 text-gray-400"></i>
                      <input
                        type="number"
                        value={vitalSigns.FC}
                        disabled={camposCargados.fc}
                        onChange={(e) => { if (e.target.value.length > 3) {  return; } setVitalSigns(v => ({ ...v, FC: e.target.value })); }}
                        className={`w-full p-2 pl-9 pr-10 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${camposCargados.fc ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                        placeholder="70"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">lpm</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Frecuencia cardiaca
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      FR (rpm)
                    </label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-wind text-xs absolute left-3 text-gray-400 pointer-events-none z-10"></i>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={vitalSigns.FR} 
                        onChange={(e) => {
                          if (e.target.value.length > 4) {
                            return;
                          }
                          
                          setVitalSigns(v => ({ ...v, FR: e.target.value }));
                        }} 
                        className="w-full p-2 pl-9 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="18"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">rpm</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Frecuencia respiratoria
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SpO2 (%)</label>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-lungs text-xs absolute left-3 top-2.5 text-gray-400"></i>
                      <input
                        type="number"
                        value={vitalSigns.SpO2}
                        disabled={camposCargados.spo2}
                        onChange={(e) => {
                          const r=e.target.value;

                          if(r === "") {
                            setVitalSigns( v => ({ ...v, SpO2: "" }));
                            return
                          }

                          if (parseInt(r) > 100 || r.length > 3)
                            return;setVitalSigns(v => ({ ...v, SpO2: r }));
                        }}
                        className={`w-full p-2 pl-9 pr-10 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${camposCargados.spo2 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                        placeholder="98"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Saturación de oxígeno
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className={`bg-white rounded-xl border border-gray-50 shadow-xs p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <i className="fa-solid fa-clipboard text-sea-blue mr-3"></i>
                  Plan Médico y Diagnóstico
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Diagnóstico
                    </label>
                    <input
                      type="text"
                      value={formData.Diagnostico}
                      onChange={(e) => setFormData(f => ({ ...f, Diagnostico: e.target.value }))}
                      className="w-full p-2 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none"
                      placeholder="Diagnóstico"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Recomendaciones
                    </label>
                    <textarea
                      rows={2} 
                      value={formData.Recomendaciones} 
                      onChange={(e) => setFormData(f => ({ ...f, Recomendaciones: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none resize-none"
                      placeholder="Recomendaciones"
                    />
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className={`bg-white rounded-xl border border-gray-50 shadow-xs px-6 py-4`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800 mb-0 flex items-center">
                    <i className="fa-solid fa-capsules text-sea-blue mr-3"></i>
                    Receta Médica
                  </h2>
                  <button
                    onClick={agregarMedicamento}
                    disabled={!matriculaValida}
                    // className="flex items-center bg-horz-blue/15 hover:bg-horz-blue/30 -translate-y-1 hover:-translate-y-2 text-sea-blue px-2.5 py-1 rounded-lg text-sm font-medium border border-horz-blue transition-all cursor-pointer"
                    className="flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-60 disabled:cursor-default disabled:hover:-translate-y-0 disabled:hover:from-sea-blue disabled:hover:to-sky-blue hover:-translate-y-1 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Añadir Fármaco
                  </button>
                </div>
                <label className="block text-xs font-medium text-gray-700 mb-3">
                  Lista de medicamentos
                </label>
                {medicamentosReceta.length > 0 ? (
                  <div className="overflow-x-auto mb-4 border border-gray-50 shadow-xs rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-linear-to-r from-white to-gray-100 text-xs font-medium text-gray-700">
                          <th className="px-3 py-2 font-medium">
                            Fármaco / Sustancia
                          </th>
                          <th className="px-3 py-2 font-medium">
                            Dósis
                          </th>
                          <th className="px-3 py-2 font-medium">
                            Frecuencia
                          </th>
                          <th className="px-3 py-2 font-medium">
                            Duración
                          </th>
                          <th className="px-3 py-2 font-medium text-center">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicamentosReceta.map(med => (
                          <tr 
                            key={med.id} 
                            // className="border-b border-gray-100 last:border-0"
                          >
                            <td className="w-full px-2 py-1">
                              <div className="relative flex items-center">
                                {/* <i className="fa-solid fa-pills text-xs absolute left-3 top-2 text-gray-400"></i> */}
                                <i className="fa-solid fa-pills absolute left-3 text-gray-400"></i>
                                <input
                                  type="text" 
                                  value={med.medicamento} 
                                  onChange={(e) => actualizarMedicamento(med.id, "medicamento", e.target.value)} 
                                  className="w-full border border-gray-50 shadow-xs rounded px-2 py-1.5 pl-9 outline-none text-xs"
                                  placeholder="Fármaco / Sustancia"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="relative flex items-center">
                                <i className="fa-solid fa-flask text-xs absolute left-3 top-2 text-gray-400"></i>
                                <input 
                                  type="text" 
                                  value={med.dosis} 
                                  onChange={(e) => { if (e.target.value.length > 20) { return; } actualizarMedicamento(med.id, "dosis", e.target.value) }}
                                  className="w-30 border border-gray-50 shadow-xs rounded px-2 py-1.5 pl-9 outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="1"
                                />
                                {/* <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">tab</span> */}
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="relative flex items-center">
                                <i className="fa-solid fa-clock text-xs absolute left-3 top-2 text-gray-400"></i>
                                <span className="absolute left-9 text-gray-400 text-xs pointer-events-none">c /</span>
                                <input 
                                  type="number" 
                                  value={med.frecuencia} 
                                  onChange={(e) => { if (e.target.value.length > 2) { return; } actualizarMedicamento(med.id, "frecuencia", e.target.value) }} 
                                  className="w-30 border border-gray-50 shadow-xs rounded px-2 py-1.5 pl-13 outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="12" 
                                />
                                <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">hrs</span>
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="relative flex items-center">
                                <i className="fa-solid fa-calendar-days text-xs absolute left-3 top-2 text-gray-400"></i>
                                <input 
                                  type="number" 
                                  value={med.duracion} 
                                  onChange={(e) => { if (e.target.value.length > 2) { return; } actualizarMedicamento(med.id, "duracion", e.target.value) }} 
                                  className="w-30 border border-gray-50 shadow-xs rounded px-2 py-1.5 pl-9 outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="7"
                                />
                                <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">días</span>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button 
                                title="Eliminar"
                                onClick={() => eliminarMedicamento(med.id)}
                                // className="p-1.5 w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                className="w-10 h-10 text-gray-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all group cursor-pointer"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-[32px] mb-4 border border-gray-50 rounded-lg shadow-xs text-xs bg-gray-100 text-gray-400 font-small outline-none">
                    No hay medicamentos prescritos en la receta actual.
                  </div>
                )}
              </motion.div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={handleSaveConsult}
                  disabled={saving || loadingMat || !matriculaValida}
                  className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-60 disabled:cursor-default disabled:hover:-translate-y-0 disabled:hover:from-sea-blue disabled:hover:to-sky-blue hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                >
                  {saving ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i></> : <><i className="fa-solid fa-plus mr-2"></i></> }
                  Guardar
                </button>
              </div>
            </div>

            {/* Panel IA */}
            <div className="col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative overflow-hidden bg-linear-to-b from-blue-50 to-white rounded-xl border border-gray-50 shadow-xs p-6`}
                // sticky top-55 z-1
              >
                <ShimmerOverlay subtle />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center text-clinical-darkBlue font-bold text-sm">
                    <i className="fa-solid fa-robot mr-3"></i>
                    TNG Sano-AI Assistant
                  </div>
                  {!aiResult&&!analyzing&&(
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-clinical-blue"></span>
                    </span>
                  )}
                </div>
                {!aiResult ? (
                  <div className="relative text-center pt-4 pb-2">
                    <div className="relative z-0 flex items-center justify-center mt-3 mb-8">
                      {analyzing &&
                        [0, 0.5, 1, 1.5, 2].map((d, i) => (
                          <i
                            key={i}
                            className="fa-solid fa-atom absolute text-horz-blue/30"
                            style={{
                              fontSize: 48,
                              animation: "aiSparkRipple 2.6s ease-out infinite",
                              animationDelay: `${d}s`,
                            }}
                          />
                        ))
                      }

                      <i className={`fa-solid fa-atom relative text-5xl ${analyzing ? "ai-icon-pulse-transicion animate-spin-periodic" : "text-gray-300"}`}></i>
                    </div>
                      
                    <p className="relative z-0 text-xs font-semibold text-gray-700 mb-6 min-h-8">
                      {analyzing ? "Analizando cuadro clínico y cruzando datos capturados" : "El asistente está listo para analizar los síntomas y signos capturados."}
                    </p>
                      
                    <button
                      onClick={handleAIAnalysis}
                      disabled={analyzing || !matriculaValida}
                      className="relative z-0 w-full items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-60 disabled:cursor-default disabled:hover:-translate-y-0 disabled:hover:from-sea-blue disabled:hover:to-sky-blue hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                    >
                      {analyzing ? "Procesando..." : "Analizar Consulta Actual"}
                    </button>
                      
                    <style>{`
                      .ai-icon-pulse-transicion::before {
                        background: linear-gradient(90deg, #002E6D, #009BDE, #002E6D);
                        background-size: 250% auto;
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        animation: aiIconShimmerTransicion 2.2s linear infinite;
                      }
                      @keyframes aiIconShimmerTransicion {
                        0%   { background-position: 0% center; }
                        100% { background-position: -250% center; }
                      }
                    `}</style>

                    {analyzing && (
                      <style>{`
                        @keyframes aiSparkRipple {
                          0% {
                            transform: scale(0.3) rotate(0deg);
                            opacity: 0.6;
                          }
                          100% {
                            transform: scale(6.5) ;
                            opacity: 0;
                          }
                        }
                      `}</style>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{opacity:0,scale:0.95}}
                    animate={{opacity:1,scale:1}} 
                    className="space-y-5"
                  >
                    <div className={`flex items-center gap-3 rounded-xl border border-gray-50 shadow-xs px-4 py-3 bg-linear-to-r ${aiResult.riesgo === "Alto" ? "from-red-100 to-red-50/50 text-red-600" : aiResult.riesgo === "Moderado" ? "from-sunray-yellow/20 to-sunray-yellow/5 text-yellow-600" : "from-horz-blue/30 to-horz-blue/5 text-sea-blue"}`}>
                      <i className="fa-solid fa-shield-halved shrink-0"></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-wide">
                          Nivel de Riesgo: {aiResult.riesgo}
                        </p>
                        <p className="text-[11px] font-medium truncate">
                          {aiResult.inconsistencias[0]}
                        </p>
                      </div>
                    </div>
                    {aiResult.antecedentesRelevantes && aiResult.antecedentesRelevantes.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-1">
                          Antecedentes Relevantes
                        </label>
                        <ul className="space-y-1.5">
                          {aiResult.antecedentesRelevantes.map((a, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs text-justify bg-white text-gray-700 font-medium"
                            >
                              {/* <i className="fa-solid fa-clock-rotate-left text-sea-blue shrink-0"></i> */}
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-1">
                        Diagnóstico Diferencial
                      </label>
                      <ul className="space-y-1.5">
                        {(aiResult.diagnosticoDiferencial || aiResult.diferencial || []).map((d,i)=>(
                          <li
                            key={i}
                            className="flex items-center gap-2 w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-white text-gray-700 font-medium"
                          >
                            {/* <i className="fa-solid fa-stethoscope text-sea-blue shrink-0"></i> */}
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider mb-1">
                        Sugerencias (IA)
                        {/* <i className="fa-solid fa-brain animate-brain-pulse"></i> */}
                      </label>
                      <ul className="space-y-1.5">
                        {(aiResult.sugerenciasTratamiento || aiResult.sugerencias || []).map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 w-full px-3 py-2 border border-gray-50 shadow-xs rounded-lg text-xs bg-white text-gray-700 font-medium text-justify"
                          >
                            {/* <i className="fa-solid fa-lightbulb text-sea-blue shrink-0 mt-0.5"></i> */}
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => setAiResult(null)}
                      className="mt-4 text-xs font-semibold text-gray-400 hover:text-sea-blue text-center w-full cursor-pointer"
                    >
                      Descartar análisis
                    </button>
                  </motion.div>
                )}
              </motion.div>

              <AnimatePresence>
                {medicionEquipo && (
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`relative overflow-hidden bg-linear-to-b from-blue-50 to-white rounded-xl border border-gray-50 shadow-xs p-6`}
                  >
                    <ShimmerOverlay subtle />

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sea-blue font-bold text-sm">
                        <i className="fa-solid fa-heart-circle-bolt mr-3"></i>
                        Toma de Signos Vitales
                      </div>
                    </div>
                    
                    {medicionCargando ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <svg viewBox="0 0 200 60" className="w-full h-14 text-rose-400" style={{ overflow: "visible" }}>
                          <polyline
                            points="0,30 55,30 65,8 75,52 85,30 200,30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ekg-line"
                          />
                        </svg>
                        <p className="text-xs text-gray-400 mt-2">
                          Procesando medición recibida...
                        </p>
                        <style>{`
                          .ekg-line {
                            stroke-dasharray: 340;
                            stroke-dashoffset: 340;
                            animation: ekgDraw 1.4s ease-in-out infinite;
                          }
                          @keyframes ekgDraw {
                            0%   { stroke-dashoffset: 340; }
                            50%  { stroke-dashoffset: 0; }
                            100% { stroke-dashoffset: -340; }
                          }
                        `}</style>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <p className="relative z-0 text-xs font-semibold text-gray-700 mb-4">
                          <i className="mr-1"></i>
                          Fecha de medición: {formatFechaMedicion(medicionEquipo.Fecha_medicion)}
                        </p>

                        <div className="grid grid-cols-1 gap-2">
                          {indicadoresMedicion(medicionEquipo).map((ind, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-50 shadow-xs bg-white"
                            >
                              <i className={`${ind.iconClass} text-sm w-4 text-center shrink-0 text-sea-blue`}></i>
                              <div className="overflow-hidden">
                                <p className="text-[9px] uppercase font-semibold text-gray-400 truncate">
                                  {ind.label}
                                </p>
                                <p className="text-xs font-bold truncate text-gray-800">
                                  {ind.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleCargarResultados}
                          disabled={signosCargados}
                          className="mt-4 w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-60 disabled:cursor-default disabled:hover:-translate-y-0 disabled:hover:from-sea-blue disabled:hover:to-sky-blue hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                        >
                          {/* <i className={`fa-solid ${signosCargados ? "fa-check" : "fa-download"} mr-2`}></i> */}
                          {signosCargados ? "Resultados cargados" : "Cargar Resultados"}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <aside
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] bg-white shadow-xs z-40 transition-all duration-300 ease-in-out ${ showHistory ? "" : "translate-x-full" }`}
        style={isDetailFullscreen ? { left: fullscreenLeft } : { width: showHistory ? (isDetailOpen ? 300 + 420 : 300) : 300 }}
      >
        <div className="flex h-full w-full">
          <div className="flex flex-col border-0 h-full shrink-0" style={{ width: 300 }}>
            {/* shadow-2xl shadow-gray-500 */}
            <div className="px-3 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  title="Regresar"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue transition-all cursor-pointer"
                  onClick={handleCloseExp}
                >
                  {isDetailOpen ? <i className="fa-solid fa-chevron-left text-sm"></i> : <i className="fa-solid fa-chevron-right text-sm"></i>}
                </button>
                <div>
                  <p className="text-xs font-bold text-gray-800 truncate uppercase max-w-[320px]">
                    <i className="fa-solid fa-clock-rotate-left mr-1.5"></i>
                    Historial
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {patientData.nombre}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden px-3 py-4 flex flex-col gap-1.5">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <div className="w-12 h-12 rounded-full animate-spin bg-linear-to-r from-sea-blue to-sky-blue p-[4px] mt-2">
                    <div className="w-full h-full rounded-full bg-white"></div>
                  </div>
                  <span className="text-xs mt-3">
                    Cargando historial...
                  </span>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <div className="bg-linear-to-b from-gray-200/50 to-gray-50 shadow-xs w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-circle-exclamation text-3xl text-gray-400/50"></i>
                  </div>
                  {/* <h2 className="text-sm font-bold text-gray-800">
                    Sin consultas previas
                  </h2> */}
                  <p className="text-gray-500 text-xs">
                    El paciente aún no tiene un historial de consultas en sistema.
                  </p>
                </div>
              ) : (
                historialPorAnio.map(([anio, consultas]) => {
                  const abierto = anioExpandido === anio;

                  return (
                    <div key={anio} className={abierto ? "flex flex-col flex-1 min-h-0" : "shrink-0"}>
                      <button
                        type="button"
                        onClick={() => toggleAnio(anio)}
                        className={`w-full shrink-0 flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${abierto ? "bg-sea-blue/10" : "bg-gray-50 hover:bg-gray-100"}`}
                      >
                        <span className={`text-xs font-bold flex items-center gap-2 ${abierto ? "text-sea-blue" : "text-gray-700"}`}>
                          <i className="fa-solid fa-bars-progress"></i>
                          {anio}
                          <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${abierto ? "bg-sea-blue/15 text-sea-blue" : "bg-gray-200 text-gray-500"}`}>
                            {consultas.length}
                          </span>
                        </span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 text-[10px] transition-transform duration-300 ${abierto ? "rotate-180 text-sea-blue" : ""}`}></i>
                      </button>

                      <AnimatePresence initial={false}>
                        {abierto && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="flex-1 min-h-0 flex flex-col overflow-hidden"
                          >
                            <div className="flex flex-col gap-1.5 mt-1.5 flex-1 min-h-0 overflow-y-auto">
                              {consultas.map(consulta => {
                                const isSelected = selectedExp?.ID === consulta.ID && isDetailOpen;

                                return (
                                  <div
                                    key={consulta.ID}
                                    onClick={() => handleOpenExp(consulta)}

                                    className={`group px-3 py-2 rounded-xl transition-all cursor-pointer ${isSelected ? "bg-sea-blue/5" : "border-gray-200 hover:border-sea-blue/30 hover:bg-gray-50"}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`px-1 rounded flex items-center justify-center transition-colors ${isSelected ? "text-sea-blue" : "text-gray-400 group-hover:text-sea-blue/60"}`}>
                                        <i className="fa-solid fa-grip-vertical text-sm"></i>
                                      </div>
                                      <div className="overflow-hidden">
                                        <p className="text-[10px] text-gray-400 font-medium uppercase">
                                          <strong>
                                            {formatDate(consulta.FechaConsulta ?? "")}
                                          </strong>
                                        </p>
                                        <p className="text-[11px] font-bold truncate uppercase text-gray-600">
                                          {consulta.Atencion}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase truncate">
                                          {consulta.ProtocoloNombre}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Detalle (columna derecha, se expande) — igual que VisorPDFInline en Documentos.tsx ── */}
          <div className={`flex-1 bg-white transition-all duration-300 overflow-hidden ${isDetailOpen ? "opacity-100" : "w-0 opacity-0"}`}>
            {isDetailOpen && selectedExp && (
              <div className="flex h-full w-full overflow-hidden">
                <div className={isDetailFullscreen ? "flex-1 min-w-0" : "flex-1 min-w-0"}>
                  <DetalleConsulta
                    consulta={selectedExp}
                    onDelete={handleDeleteConsulta}
                    isFullscreen={isDetailFullscreen}
                    onToggleFullscreen={() => setIsDetailFullscreen(f => !f)}
                  />
                </div>

                <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isDetailFullscreen ? "flex-1 min-w-0 opacity-100" : "w-0 opacity-0"}`}>
                    <div className="py-4 px-5 flex justify-between items-center shrink-0">
                      <p className="text-xs font-bold text-gray-800 flex items-center">
                        {/* <i className="fa-solid fa-file-prescription mr-1.5"></i>
                        Receta médica */}
                      </p>
                      <div className="flex items-center gap-1">
                        {isDetailFullscreen && selectedExp && (
                          <>
                            <button
                              title="Salir de pantalla completa"
                              onClick={() => setIsDetailFullscreen(false)}
                              className="w-10 h-10 text-gray-400 hover:text-sea-blue rounded-xl flex items-center justify-center transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-compress text-lg"></i>
                            </button>
                            <button
                              title="Eliminar"
                              onClick={() => handleDeleteConsulta(selectedExp.ID)}
                              className="w-10 h-10 text-gray-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-arrow-up"></i>
                            </button>
                          </>
                        )}
                        <button
                          title="Imprimir"
                          onClick={handlePrintReceta}
                          className="w-10 h-10 text-gray-400 hover:text-sea-blue rounded-xl flex items-center justify-center transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-print text-lg"></i>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto flex justify-center">
                      <div
                        ref={recetaPrintRef}
                        className="bg-white relative flex flex-col px-5 py-4 w-full max-w-[640px] print:shadow-none print:p-10 print:w-[210mm] print:mx-auto"
                      >
                        <div className="border-b-2 border-clinical-blue pb-4 mb-4 flex justify-between">
                          <div>
                            <div className="text-xl font-bold text-gray-800 tracking-tight">
                              TNG
                            </div>
                            <div className="text-[11px] text-gray-500 leading-tight mt-1">
                              Dr. {(user as any)?.nombre}
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-gray-500">
                            Fecha: {formatDate(selectedExp.FechaConsulta ?? "")}<br />
                            {/* Folio: {selectedExp.ID} */}
                          </div>
                        </div>
                        <div className="mb-5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Datos del Paciente
                          </span>
                          <div className="text-base font-bold text-gray-800 border-b border-gray-100 pb-1 mt-0.5">
                            {patientData.nombre}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1.5 flex gap-3">
                            <span>Matrícula: {patientData.matricula || "-"}</span>
                            {patientData.edad && <span>Edad: {patientData.edad} años</span>}
                          </div>
                        </div>
                        <div className="flex-1 text-sm text-gray-700 leading-relaxed font-sans space-y-4 print:flex-none print:pb-36">
                          <div className="font-bold text-2xl mb-3 text-clinical-blue">
                            ℞
                          </div>
                          {(() => {
                            const meds = parseRecetaMeds(selectedExp.Recetas);
                            return meds.length > 0 ? (
                              meds.map((med, idx) => (
                                <div key={idx} className="pl-2 border-l-2 border-transparent hover:border-gray-200 transition-colors">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr>
                                        <th className="pl-2 text-left font-semibold w-1/8">#{idx + 1}</th>
                                        <th className="text-left font-semibold w-3/8">Medicamento</th>
                                        <th className="text-left font-semibold w-1/8">Dosis</th>
                                        <th className="text-left font-semibold w-1/8">Frec.</th>
                                        <th className="text-left font-semibold w-1/8">Duración</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="px-3 py-2 text-center"></td>
                                        <td className="py-2 text-left uppercase">{med.Farmaco}</td>
                                        <td className="py-2 text-left uppercase">{med.Dosis} tab</td>
                                        <td className="py-2 text-left uppercase">{med.Frecuencia} hrs</td>
                                        <td className="py-2 text-left uppercase">{med.Duracion} días</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-400 italic text-center py-10 text-sm">
                                Esta consulta no tiene fármacos registrados.
                              </div>
                            );
                          })()}
                        </div>
                        <div className="mt-auto print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-white print:px-10 print:pb-8">
                          {/* <div className="text-xs text-gray-700 font-sans">
                            <p className="pl-5 py-2 italic">
                              {selectedExp.Recomendacion}
                            </p>
                          </div> */}
                          <div className="border-t border-gray-200 pt-4 flex items-end justify-between">
                            <div className="text-center w-36">
                              <div className="border-b border-gray-400 mb-1.5"></div>
                              <div className="text-[10px] text-gray-500 font-sans tracking-wide">
                                Firma del Médico
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            )}
          </div>

        </div>
      </aside>
    </div>
  );
};

export default Consultas;