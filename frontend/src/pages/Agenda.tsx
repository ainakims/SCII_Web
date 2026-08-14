import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useAuth } from "../context/AuthToken";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  LibraryBig,
  Grip,
  Aperture,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import vacuna from "../assets/img/vacuna.jpg";
import indicador from "../assets/img/indicador.png";
import imss from "../assets/img/imss.jpg";

import imss_logo from "../assets/img/logo-imss.png"

interface MockPatient {
  matricula: string;
  nombre: string;
  edad: number;
}

interface FormData {
  id: string;
  matricula: string;
  estatus: string;
  patientName: string;
  motivo: string;
  dia: number | string;
  hora: number | string;
  minutos: number;
  periodo: string;
  duracion: number;
  notas: string;
}

interface Appointment {
  id: number;
  matricula: string;
  time: string;
  nombre: string;
  type: string;
  status: string;
  dia: number;
  hora: number;
  minutos: number;
  duracion: number;
  notas: string;
  pacientes?: Array<{ matricula: string; nombre: string }>;
}

interface StoredPatient {
  matricula?: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

interface SelectedPatient {
  matricula: string;
  nombre: string;
  id: string;
  estatus: string;
}

interface SavedGroup { id: number; name: string; patients: SelectedPatient[]; }


const ROLES_PRIVILEGIADOS_AGENDA = ["admin", "médico", "medico"];

const Agenda: React.FC = () => {
  const now = new Date();
  const { user } = useAuth() as { user: { puesto?: string; matricula?: string; rol?: string} };
  const esPrivilegiado = ROLES_PRIVILEGIADOS_AGENDA.includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  const getMonday = (d: Date): Date => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m = new Date(d);
    m.setDate(d.getDate() + diff);
    m.setHours(0, 0, 0, 0);
    return m;
  };

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [miniMonthOffset, setMiniMonthOffset] = useState<number>(0);
  const [miniView, setMiniView] = useState<"days" | "months">("days");
  const [loadingMat, setLoadingMat] = useState(false);
  const [matriculaNotFound, setMatriculaNotFound] = useState(false);
  const [matriculaNotRegis, setMatriculaNotRegis] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [diasFestivos, setDiasFestivos] = useState<{ dia: number; mes: number; anio: number; nombre: string }[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);

  // Multi-patient autocomplete
  const [matInput, setMatInput] = useState("");
  const [matSuggestions, setMatSuggestions] = useState<SelectedPatient[]>([]);
  const [matLoadingAuto, setMatLoadingAuto] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<SelectedPatient[]>([]);

  // Grupos guardados en BD
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Modal independiente de grupos
  const [gruposModalOpen, setGruposModalOpen] = useState(false);
  const [mgNombre, setMgNombre] = useState("");
  const [mgPacientes, setMgPacientes] = useState<SelectedPatient[]>([]);
  const [mgInput, setMgInput] = useState("");
  const [mgSuggestions, setMgSuggestions] = useState<SelectedPatient[]>([]);
  const [mgLoading, setMgLoading] = useState(false);
  const [mgShowSug, setMgShowSug] = useState(false);
  const [mgSaving, setMgSaving] = useState(false);

  const fetchGrupos = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/Grupos/ObtenerGrupos`, {
        method: "POST",
        body: JSON.stringify({ medico: user?.matricula ?? "" })
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setSavedGroups(data.data.map((g: any) => ({
          id: g.ID,
          name: g.Nombre,
          patients: (() => { try { return JSON.parse(g.Pacientes ?? "[]"); } catch { return []; } })()
        })));
      }
    } catch (err) {
      console.error("Error cargando grupos:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSaveGroup = async () => {
    const name = groupNameInput.trim();
    if (!name || selectedPatients.length === 0) return;
    try {
      await fetchWithAuth(`${API_BASE_URL}/Grupos/GuardarGrupo`, {
        method: "POST",
        body: JSON.stringify({ medico: user?.matricula ?? "", nombre: name, pacientes: selectedPatients })
      });
      setGroupNameInput("");
      setSavingGroup(false);
      await fetchGrupos();
    } catch (err) {
      console.error("Error guardando grupo:", err);
    }
  };

  const handleLoadGroup = (g: SavedGroup) => {
    setSelectedPatients(g.patients);
    setShowGroups(false);
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/Grupos/EliminarGrupo`, {
        method: "POST",
        body: JSON.stringify({ id })
      });
      setSavedGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error("Error eliminando grupo:", err);
    }
  };

  const monday = new Date(getMonday(now));
  monday.setDate(monday.getDate() + weekOffset * 7);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  // const dayNamesShort = ["L", "M", "M", "J", "V", "S", "D"];

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
  }

  // const monthName = monday.toLocaleString("es-ES", { month: "long" });
  // const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  // const headerDate = `${capitalizedMonth} ${monday.getFullYear()}`;

  const HOUR_START = 0;  // hora de inicio del grid (12 AM - día completo)
  const HOUR_END   = 23; // hora de fin del grid (11 PM)
  const times: string[] = Array.from({ length: 24 }, (_, i) => {
    const h = i;
    if (h === 0)  return "12 A.M.";
    if (h === 12) return "12 P.M.";
    if (h < 12)   return `${h} A.M.`;
    return `${h - 12} P.M.`;
  });
  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/Agenda/ObtenerFestivos`, { method: "GET" })
      .then(r => r.json())
      .then(json => { if (json.ok) setDiasFestivos(json.data ?? []); })
      .catch(() => {});
  }, []);

  const miniMonthBase = new Date(now.getFullYear(), now.getMonth() + miniMonthOffset, 1);
  const miniYear = miniMonthBase.getFullYear();
  const miniMonth = miniMonthBase.getMonth();
  const miniMonthName = miniMonthBase.toLocaleString("es-ES", { month: "long" });
  const miniMonthCap = miniMonthName.charAt(0).toUpperCase() + miniMonthName.slice(1);

  const firstDayOfMonth = new Date(miniYear, miniMonth, 1).getDay();
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const miniPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const miniStartDate = new Date(miniYear, miniMonth, 1 - miniPadding);
  const totalCells = Math.ceil((miniPadding + daysInMonth) / 7) * 7;
  const miniDays = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(miniStartDate);
    d.setDate(miniStartDate.getDate() + i);
    return { date: d, isCurrentMonth: d.getMonth() === miniMonth };
  });

  const handleMiniDayClick = (clicked: Date): void => {
    const clickedMonday = getMonday(clicked);
    const baseMonday = getMonday(now);
    const diffMs = clickedMonday.getTime() - baseMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 3600 * 1000));

    if (diffWeeks === weekOffset) {
      setFetchTrigger(t => t + 1);
    } else {
      setWeekOffset(diffWeeks);
    }
  };

  const goToToday = (): void => {
    setWeekOffset(0);
    setMiniMonthOffset(0);
  };

  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [overlapWarning, setOverlapWarning] = useState<Appointment | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    id: "",
    matricula: "",
    estatus: "",
    patientName: "",
    motivo: "",
    dia: "0",
    hora: "1",
    minutos: 0,
    periodo: "AM",
    duracion: 0.00,
    notas: "",
  });

  useEffect(() => {
    if (editingId && formData.motivo !== "IND") return;
    if (!matInput || matInput.length < 2) {
      setMatSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        setMatLoadingAuto(true);
        const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMatricula`, {
          method: "POST",
          body: JSON.stringify({ matricula: matInput })
        });
        const res = await cons.json();
        if (res?.data?.length > 0) {
          console.dir(res.data);

          const yaSeleccionados = new Set(selectedPatients.map(s => String(s.matricula)));
          const filtrados = res.data
            .map((p: any) => {
              // Empl_matricula puede venir como string, number, objeto xml2js null o undefined
              // Intentar varios campos posibles y garantizar string puro
              const rawMat = p.Empl_matricula ?? p.Matricula ?? p.matricula;
              const mat = (rawMat != null && typeof rawMat !== "object")
                ? String(rawMat)
                : matInput; // último recurso: lo que el usuario escribió
              return {
                matricula: mat,
                nombre: p.Nombre ?? p.nombre ?? "",
                id: mat,
                estatus: p.Empl_status ?? p.estatus ?? "A"
              };
            })
            .filter((p: SelectedPatient) => p.matricula.length >= 3 && !yaSeleccionados.has(p.matricula));

          setMatSuggestions(filtrados);
          setShowSuggestions(filtrados.length > 0);
        } else {
          setMatSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error("Error buscando matrícula:", err);
        setMatSuggestions([]);
      } finally {
        setMatLoadingAuto(false);
      }
    }, 200);
    return () => clearTimeout(delay);
  }, [matInput, editingId]);

  // Búsqueda autocomplete del modal de grupos
  useEffect(() => {
    if (!mgInput || mgInput.length < 2) { setMgSuggestions([]); setMgShowSug(false); return; }
    const t = setTimeout(async () => {
      try {
        setMgLoading(true);
        const res = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMatricula`, {
          method: "POST", body: JSON.stringify({ matricula: mgInput })
        });
        const data = await res.json();
        if (data?.data?.length > 0) {
          const yaEstan = new Set(mgPacientes.map(p => p.matricula));
          const filtrados = data.data
            .map((p: any) => ({ matricula: p.Empl_matricula ?? "", nombre: p.Nombre ?? "", id: String(p.Empl_matricula ?? ""), estatus: p.Empl_status ?? "" }))
            .filter((p: SelectedPatient) => !yaEstan.has(p.matricula));
          setMgSuggestions(filtrados);
          setMgShowSug(filtrados.length > 0);
        } else { setMgSuggestions([]); setMgShowSug(false); }
      } catch { setMgSuggestions([]); } finally { setMgLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [mgInput, mgPacientes]);

  const handleSaveNewGroup = async () => {
    const name = mgNombre.trim();
    if (!name || mgPacientes.length === 0) return;
    setMgSaving(true);
    try {
      await fetchWithAuth(`${API_BASE_URL}/Grupos/GuardarGrupo`, {
        method: "POST",
        body: JSON.stringify({ medico: user?.matricula ?? "", nombre: name, pacientes: mgPacientes })
      });
      setMgNombre(""); setMgPacientes([]); setMgInput("");
      await fetchGrupos();
    } catch (err) { console.error(err); } finally { setMgSaving(false); }
  };

  // Cita múltiple: forzar motivo IND y bloquearlo
  useEffect(() => {
    if (selectedPatients.length > 1) {
      setFormData(f => ({ ...f, motivo: "IND" }));
    }
  }, [selectedPatients.length]);

  // Auto-scroll al horario laboral (7 AM) al montar el calendario
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 7 * 64;
    }
  }, []);

  // Mide el espacio real disponible hasta el borde inferior de la ventana,
  // en vez de adivinarlo con un número fijo (evita cortes/espacios en blanco
  // al cambiar el zoom o el alto del navegador).
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!pageContainerRef.current) return;
      const top = pageContainerRef.current.getBoundingClientRect().top;
      const mainEl = pageContainerRef.current.closest("main");
      const bottomPad = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
      setPageHeight(Math.max(Math.floor(window.innerHeight - top - bottomPad), 400));
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const fetchCitas = async () => {
      setAppointments([]);

      try {
        const baseMonday = getMonday(now);
        const localMonday = new Date(baseMonday);
        localMonday.setDate(baseMonday.getDate() + weekOffset * 7);

        const localWeekDates: Date[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(localMonday);
          d.setDate(localMonday.getDate() + i);
          return d;
        });

        const inicio = localWeekDates[0].toISOString().split("T")[0];
        const final = localWeekDates[6].toISOString().split("T")[0];

        const matricula = esPrivilegiado ? "0" : user?.matricula;

        const consUser = await fetchWithAuth(`${API_BASE_URL}/Agenda/ObtenerCitas`, {
          method: "POST",
          body: JSON.stringify({ matricula, inicio, final })
        });
        const resUser = await consUser.json();
        let allData: any[] = resUser.data ?? [];

        if (!esPrivilegiado) {
          const consJor = await fetchWithAuth(`${API_BASE_URL}/Agenda/ObtenerCitas`, {
            method: "POST",
            body: JSON.stringify({ matricula: "0", inicio, final })
          });
          const resJor = await consJor.json();
          const allItems = resJor.data ?? [];
          const existingIds = new Set(allData.map((c: any) => c.IdAgenda));
          // VAC e IMSS: visible para todos
          const jorItems = allItems.filter((c: any) => c.Motivo === "VAC" || c.Motivo === "IMSS");
          // IND: solo si la matrícula del usuario está en el CSV de matriculas
          const userMat = String(user?.matricula ?? "").trim();
          const indItems = allItems.filter((c: any) =>
            c.Motivo === "IND" &&
            String(c.Matricula ?? "").split(",").map((m: string) => m.trim()).includes(userMat)
          );
          const extras = [...jorItems, ...indItems].filter((c: any) => !existingIds.has(c.IdAgenda));
          allData = [...allData, ...extras];
        }

        const res = { data: allData };

        const mapped: Appointment[] = res.data.map((c: any) => {
          const horaOriginal = parseInt(c.Hora);
          const minutos = parseInt(c.Minutos ?? "0") || 0;
          let hora24 = horaOriginal;
          if (c.Periodo === "PM") {
            // Si hora < 12: formato 12h correcto → sumar 12 (ej. 2 PM → 14)
            // Si hora === 12: mediodía → queda en 12
            // Si hora > 12: registro antiguo guardado en 24h → ya está bien
            if (horaOriginal < 12) hora24 = horaOriginal + 12;
          } else { // AM
            if (horaOriginal === 12) hora24 = 0; // medianoche
          }
          const hora24decimal = hora24 + minutos / 60; // ej. 9.5 para 9:30

          const [year, month, day] = (c.FechaCompleta as string).split("T")[0].split("-").map(Number);

          const diaIndex = localWeekDates.findIndex(d =>
            d.getFullYear() === year &&
            d.getMonth() === month - 1 &&
            d.getDate() === day
          );

          const str = (v: any, fallback = ""): string => typeof v === "string" ? v : fallback;
          const matriculaRaw = str(c.Matricula);

          let pacientes: Array<{ matricula: string; nombre: string }> | undefined;
          if (str(c.Motivo) === "IND" && matriculaRaw) {
            if (matriculaRaw.startsWith("[")) {
              try {
                const parsed = JSON.parse(matriculaRaw);
                if (Array.isArray(parsed)) {
                  pacientes = parsed.map((item: any) =>
                    typeof item === "string"
                      ? { matricula: item, nombre: item }
                      : { matricula: str(item?.matricula), nombre: str(item?.nombre || item?.matricula) }
                  );
                }
              } catch {}
            } else {
              pacientes = matriculaRaw.split(",").map(m => m.trim()).filter(m => m.length > 0).map(m => ({ matricula: m, nombre: m }));
            }
          }

          return {
            id: c.IdAgenda,
            matricula: matriculaRaw,
            time: `${horaOriginal}:${String(minutos).padStart(2,"0")} ${str(c.Periodo)}`,
            nombre: pacientes && pacientes.length > 0
              ? "Indicadores TNG sano"
              : str(c.Nombres, `Paciente ${c.IdPaciente ?? "?"}`),
            type: str(c.Motivo),
            status: str(c.Estado),
            dia: diaIndex === -1 ? -1 : diaIndex,
            hora: hora24decimal,
            minutos,
            duracion: parseFloat(c.Duracion) || 0,
            notas: str(c.Notas),
            pacientes,
          };
        }).filter((c: Appointment) => c.dia >= 0);

        setAppointments(mapped);
      } catch (err) {
        console.error("Error cargando citas:", err);
      }
    };

    fetchCitas();
  }, [weekOffset, fetchTrigger, esPrivilegiado]);

  useEffect(() => {
    const baseMonday = getMonday(now);
    const newMonday = new Date(baseMonday);
    newMonday.setDate(baseMonday.getDate() + weekOffset * 7);

    const diffMonths = (newMonday.getFullYear() - now.getFullYear()) * 12 + (newMonday.getMonth() - now.getMonth());

    setMiniMonthOffset(diffMonths);
  }, [weekOffset]);

  const handleSearchPatient = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, matricula: e.target.value, patientName: "" }));
    setMatriculaNotFound(false);
    setMatriculaNotRegis(false);
  };

  const handleAddPatient = (patient: SelectedPatient) => {
    if (selectedPatients.some(p => p.matricula === patient.matricula)) return;
    setSelectedPatients(prev => [...prev, patient]);
    setMatInput("");
    setMatSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemovePatient = (matricula: string) => {
    setSelectedPatients(prev => prev.filter(p => p.matricula !== matricula));
  };

  const handleSaveCita = async (overrideOverlap: boolean = false) => {
    const validations = [
      {
        condition: !editingId && formData.motivo !== "VAC" && formData.motivo !== "IMSS" && selectedPatients.length === 0,
        message: "Debe agregar al menos una <b>matrícula</b> a la cita."
      },
      {
        condition: formData.motivo === "IND" && selectedPatients.length < 2,
        message: "El tipo de cita requiere al menos <b>2 matrículas</b>."
      },
      {
        condition: !editingId && formData.motivo !== "VAC" && formData.motivo !== "IMSS" && selectedPatients.some(p => String(p.estatus).trim() !== "A"),
        message: "Todos los pacientes deben tener una <b>matrícula activa</b>."
      },
      {
        condition: !formData.motivo,
        message: "Debe seleccionar el <b>motivo</b> de la cita."
      },
      {
        condition: formData.dia === "" || formData.dia === null || formData.dia === undefined,
        message: "Debe seleccionar el <b>día</b> de la cita."
      },
      {
        condition: formData.hora === "" || formData.hora === null || formData.hora === undefined,
        message: "Debe seleccionar la <b>hora</b> de la cita."
      },
      {
        condition: !formData.periodo,
        message: "Debe seleccionar el <b>periodo (AM/PM)</b> de la cita."
      },
      {
        condition: Number(formData.duracion) < 0.5,
        message: "La duración mínima de una cita es <b>30 minutos</b>."
      },
      {
        condition: (() => {
          const diaDate = weekDates[parseInt(String(formData.dia))];
          return diaDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        })(),
        message: "No puede agendar una cita en un <b>día pasado</b>."
      },
      {
        condition: (() => {
          const diaDate = weekDates[parseInt(String(formData.dia))];
          const esHoy = diaDate?.getDate() === now.getDate() && diaDate?.getMonth() === now.getMonth() && diaDate?.getFullYear() === now.getFullYear();
          const hora24 = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
          const horaActual = now.getHours() + now.getMinutes() / 60;
          return esHoy && hora24 < horaActual;
        })(),
        message: "No puede agendar una cita en una <b>hora pasada</b>."
      }
    ];

    const error = validations.find(v => v.condition);

    if (error) {
      errorModal("Campos requeridos", error.message);
      return;
    }

    const diaIndex = parseInt(String(formData.dia));
    const selectedDate = weekDates[diaIndex];
    const formatDate = selectedDate.toISOString().split("T")[0];

    const selectedHora24 = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
    const hasOverlap = appointments.find(apt =>
      apt.type !== "VAC" && apt.type !== "IMSS" && apt.type !== "IND" &&
      apt.duracion < 3 &&
      apt.dia === diaIndex &&
      apt.id !== editingId &&
      apt.hora < selectedHora24 + Number(formData.duracion) &&
      apt.hora + apt.duracion > selectedHora24
    );

    if (hasOverlap && !overrideOverlap) {
      confirmOverlap(hasOverlap, () => handleSaveCita(true));
      return;
    }

    try {
      const hora24decimal = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;

      if (formData.motivo === "VAC" || formData.motivo === "IMSS") {
        await fetchWithAuth(`${API_BASE_URL}/Agenda/AgregarCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              id: "0",
              matricula: "0",
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: hora24decimal,
              periodo: formData.periodo,
              minutos: formData.minutos,
              duracion: Number(formData.duracion).toFixed(2),
              notas: formData.notas,
            }
          })
        });
        const msgExito = formData.motivo === "IMSS"
          ? "La jornada PrevenIMSS ha sido agendada correctamente."
          : "La campaña de vacunación ha sido agendada correctamente.";
        exitoModal("Éxito al guardar", msgExito);
      } else if (formData.motivo === "IND") {
        const matriculaJson = selectedPatients.map(p => p.matricula).join(",");
        await fetchWithAuth(`${API_BASE_URL}/Agenda/AgregarCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              id: "0",
              matricula: matriculaJson,
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: hora24decimal,
              periodo: formData.periodo,
              minutos: formData.minutos,
              duracion: Number(formData.duracion).toFixed(2),
              notas: formData.notas,
            }
          })
        });
        exitoModal("Éxito al guardar", `Indicadores agendados para ${selectedPatients.length} paciente${selectedPatients.length !== 1 ? "s" : ""}.`);
      } else {
        for (const patient of selectedPatients) {
          await fetchWithAuth(`${API_BASE_URL}/Agenda/AgregarCitas`, {
            method: "POST",
            body: JSON.stringify({
              agenda: {
                id: patient.id,
                matricula: patient.matricula,
                motivo: formData.motivo,
                fecha: formatDate,
                dia: formData.dia,
                hora: hora24decimal,
                periodo: formData.periodo,
                minutos: formData.minutos,
                duracion: Number(formData.duracion).toFixed(2),
                notas: formData.notas,
              }
            })
          });
        }
        exitoModal("Éxito al guardar", `Se ${selectedPatients.length === 1 ? "registró la cita" : `registraron ${selectedPatients.length} citas`} correctamente.`);
      }

      setFetchTrigger(t => t + 1);
      closePanel();

      if (gridScrollRef.current) {
        const hora24 = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
        const targetScroll = Math.max(0, hora24 * 64 - 100);
        gridScrollRef.current.scrollTop = targetScroll;
      }
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleUpdateCita = async (overrideOverlap: boolean = false) => {
    if (!editingId) return;

    if (formData.motivo === "IND" && selectedPatients.length < 2) {
      errorModal("Campos requeridos", "El tipo de cita requiere al menos <b>2 matrículas</b>.");
      return;
    }

    const diaIndex = parseInt(String(formData.dia));
    const selectedDate = weekDates[diaIndex];
    const formatDate = selectedDate.toISOString().split("T")[0];
    const esHoy = selectedDate?.getDate() === now.getDate() && selectedDate?.getMonth() === now.getMonth() && selectedDate?.getFullYear() === now.getFullYear();
    const hora24Edit = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
    const horaActualEdit = now.getHours() + now.getMinutes() / 60;

    if (esHoy && hora24Edit < horaActualEdit) {
      errorModal("Conflicto de horario", "No puede agendar una cita en una <b>hora pasada</b>.");
      return;
    }

    const selectedHora24 = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
    const hasOverlap = appointments.find(apt =>
      apt.type !== "VAC" && apt.type !== "IMSS" && apt.type !== "IND" &&
      apt.duracion < 3 &&
      apt.dia === diaIndex &&
      apt.id !== editingId &&
      apt.hora < selectedHora24 + Number(formData.duracion) &&
      apt.hora + apt.duracion > selectedHora24
    );

    if (hasOverlap && !overrideOverlap) {
      confirmOverlap(hasOverlap, () => handleUpdateCita(true));
      return;
    }

    try {
      const hora24decimal = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;

      if (formData.motivo === "IND") {
        await fetchWithAuth(`${API_BASE_URL}/Agenda/EliminaCitas`, {
          method: "POST",
          body: JSON.stringify({ idAgenda: editingId }),
        });

        const matriculaCSV = selectedPatients.map(p => p.matricula).join(",");
        await fetchWithAuth(`${API_BASE_URL}/Agenda/AgregarCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              id: "0",
              matricula: matriculaCSV,
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: hora24decimal,
              periodo: formData.periodo,
              minutos: formData.minutos,
              duracion: Number(formData.duracion).toFixed(2),
              notas: formData.notas,
            }
          }),
        });

        exitoModal("Éxito al editar", "Se han actualizado los datos de la cita correctamente.");
        setFetchTrigger(t => t + 1);
        closePanel();
        return;
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/Agenda/EdicionCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              idAgenda: editingId,
              matricula: formData.matricula,
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: hora24decimal,
              periodo: formData.periodo,
              minutos: formData.minutos,
              duracion: formData.duracion,
              notas: formData.notas,
            }
          })
        });

      let data: any = null;

      try { data = await res.json(); } catch { data = null; }

      if (data) {
        exitoModal("Éxito al editar", "Se han actualizado los datos de la cita correctamente.");
        setFetchTrigger(t => t + 1);
        closePanel();
      } else {
        errorModal("Error al editar", "Ocurrió un error al actualizar la cita.");
      }
    } catch {
      errorModal("Error al editar", "Ocurrió un error al actualizar la cita.");
    } finally {
      // setIsLoadingEdit(false);
    }
  };

  const handleConfirmCita = async (overrideOverlap: boolean = false) => {
    const result = await confirmModal("Confirmar asistencia", "Si se selecciona <b>presente</b>, se confirma la asistencia; <b>ausente</b> confirma la inasistencia.","Presente","Ausente");

    if (result.dismiss) {
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Agenda/ConfirmaCita`, {
        method: "POST",
        body: JSON.stringify({
          idAgenda: editingId,
          esActivo: result.isConfirmed ? "A" : result.isDenied ? "C" : null
        })
      });

      let data: any = null;

      try { data = await res.json(); } catch { data = null; }

      if (data) {
        exitoModal("Cita confirmada", "Se han confirmado la asistencia del paciente a la cita.");
        setFetchTrigger(t => t + 1);
        closePanel();
      } else {
        errorModal("Error al confirmar", "Ocurrió un error al confirmar la cita.");
      }
    } catch {
      errorModal("Error al confirmar", "Ocurrió un error al confirmar la cita.");
    } finally {
      // setIsLoadingEdit(false);
    }
  };

  const handleDeleteAppointment = async (): Promise<void> => {
    if (!editingId) return;

    const result = await confirmModal("Eliminar cita", "Si confirma esta acción se <b>eliminará la cita</b> seleccionada de forma permanente.","Eliminar","Cancelar");

    if (result.dismiss) {
      return;
    }

    if (result.isConfirmed) {
      setIsLoadingEdit(true);
      await new Promise(r => setTimeout(r, 2000));

      const dia = parseInt(String(formData.dia));
      const week = weekDates[dia];
      const date = `${week.getDate().toString().padStart(2, '0')}/${(week.getMonth() + 1).toString().padStart(2, '0')}/${week.getFullYear()}`;

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Agenda/EliminaCitas`, {
          method: "POST",
          body: JSON.stringify({ idAgenda: editingId })
        });

        const data = await res.json();

        if (data) {
          exitoModal("Cita cancelada", `Se ha cancelado la cita del día <b>${date}</b> a la <b>${formData.hora} ${formData.periodo}</b> correctamente.`);
          setFetchTrigger(t => t + 1);
        }
      } catch (err) {
        console.error("Error: ", err);
      } finally {
        closePanel();
        setIsLoadingEdit(false);
      }
    }
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="mdi mdi-check-circle-outline success-icon"></i><style> .success-icon { color: #54BBAB; font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
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
      <i class="mdi mdi-alert-circle-outline success-icon"></i>
      <style>
        .success-icon {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass:
      {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    });
  };

  const confirmModal = (title: string, message: string, confirma: string, cancelar: string) => {
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="mdi mdi-help-circle-outline success-icon"></i>
      <style>
        .success-icon {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement;
        if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i>${confirma}`,
      denyButtonText: `<i class="mdi mdi-close-thick mr-1"></i>${cancelar}`,
      showDenyButton: true,
      customClass: {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
        denyButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
      },
    })
  };

  const confirmOverlap = (overlapAppointment: Appointment, onConfirm: () => void): void => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Conflicto de horario</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">Ya existe una cita para el día <b>${dayNames[weekDates[overlapAppointment.dia]?.getDay() ?? 0].toLowerCase()} ${weekDates[overlapAppointment.dia]?.getDate()} a las ${overlapAppointment.time}</b>. ¿Desea permitir que se empalmen?</p>`,
      // <b>${overlapAppointment.nombre}</b>
      iconHtml: `
      <i class="mdi mdi-alert-circle-outline success-icon"></i>
      <style>
        .success-icon {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement;
        if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> Permitir`,
      cancelButtonText: `<i class="mdi mdi-close-thick mr-1"></i> Cancelar`,
      showCancelButton: true,
      customClass: {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
        cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
      },
    }).then((result) => {
      if (result.isConfirmed) {
        onConfirm();
      }
    });
  };

  const closePanel = (): void => {
    setIsPanelOpen(false);
    setIsViewMode(false);
    setOverlapWarning(null);
    setEditingId(null);
    setMatriculaNotFound(false);
    setMatriculaNotRegis(false);
    setMatInput("");
    setMatSuggestions([]);
    setShowSuggestions(false);
    setSelectedPatients([]);
    setFormData({
      id: "",
      matricula: "",
      estatus: "",
      patientName: "",
      motivo: "",
      dia: "0",
      hora: "1",
      minutos: 0,
      periodo: "AM",
      duracion: 0.00,
      notas: "",
    });
  };

  const openPanel = (prefill?: Partial<FormData>, prefillPatients?: SelectedPatient[]): void => {
    setEditingId(null);
    setIsViewMode(false);
    setOverlapWarning(null);
    setMatriculaNotFound(false);
    setMatriculaNotRegis(false);
    setMatInput("");
    setMatSuggestions([]);
    setShowSuggestions(false);
    setSelectedPatients(prefillPatients ?? []);

    // Día actual dentro de la semana visible
    const todayIndex = weekDates.findIndex(d =>
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
    const defaultDia = todayIndex >= 0 ? String(todayIndex) : "0";

    // Próxima hora válida — respeta medias horas
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    let defaultHora24: number;
    let defaultMinutos: number;
    if (nowM === 0) {
      defaultHora24 = nowH;       defaultMinutos = 0;   // en punto → misma hora :00
    } else if (nowM < 30) {
      defaultHora24 = nowH;       defaultMinutos = 30;  // 1-29 min → misma hora :30
    } else {
      defaultHora24 = Math.min(nowH + 1, 23); defaultMinutos = 0; // 30-59 min → siguiente hora :00
    }
    const defaultPeriodo = defaultHora24 >= 12 ? "PM" : "AM";
    const defaultHora12 = defaultHora24 === 0 ? 12 : defaultHora24 > 12 ? defaultHora24 - 12 : defaultHora24;

    setFormData({
      id: "",
      matricula: "",
      estatus: "",
      patientName: "",
      motivo: "",
      dia: defaultDia,
      hora: String(defaultHora12),
      minutos: defaultMinutos,
      periodo: defaultPeriodo,
      duracion: 0.5,
      notas: "",
      ...prefill,
    });
    setIsPanelOpen(true);
  };

  const handleEditAppointment = (apt: Appointment): void => {
    setEditingId(apt.id);
    setIsViewMode(true)

    const horaInt = Math.floor(apt.hora);
    const minutos = Math.round((apt.hora - horaInt) * 60);
    const hora12 = horaInt === 0 ? 12 : horaInt > 12 ? horaInt - 12 : horaInt;
    const periodo = horaInt >= 12 ? "PM" : "AM";

    setFormData({
      id: String(apt.id),
      matricula: apt.matricula,
      estatus: apt.status,
      patientName: apt.nombre,
      motivo: apt.type,
      dia: String(apt.dia),
      hora: String(hora12),
      minutos,
      periodo,
      duracion: apt.duracion,
      notas: apt.notas,
    });

    // Para IND restaurar la lista de seleccionados y buscar nombres reales
    if (apt.type === "IND" && apt.pacientes && apt.pacientes.length > 0) {
      // Mostrar de inmediato con matrícula como placeholder de nombre
      const base = apt.pacientes.map(p => ({
        matricula: p.matricula,
        nombre: p.nombre !== p.matricula ? p.nombre : "...",
        id: p.matricula,
        estatus: "A",
      }));
      setSelectedPatients(base);

      // Enriquecer con nombres reales en paralelo
      (async () => {
        const enriched = await Promise.all(
          apt.pacientes!.map(async (p) => {
            // Si ya tenemos el nombre real (no es igual a la matrícula), no buscar
            if (p.nombre && p.nombre !== p.matricula) {
              return { matricula: p.matricula, nombre: p.nombre, id: p.matricula, estatus: "A" };
            }
            try {
              const res = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMatricula`, {
                method: "POST",
                body: JSON.stringify({ matricula: p.matricula }),
              });
              const data = await res.json();
              const found = data?.data?.[0];
              return {
                matricula: p.matricula,
                nombre: found?.Nombre ?? p.matricula,
                id: p.matricula,
                estatus: found?.Empl_status ?? "A",
              };
            } catch {
              return { matricula: p.matricula, nombre: p.matricula, id: p.matricula, estatus: "A" };
            }
          })
        );
        setSelectedPatients(enriched);
      })();
    } else if (apt.type === "SEG" || apt.type === "PER") {
      // Pre-poblar con el paciente de la cita para mostrar el chip en edición
      setSelectedPatients([{
        matricula: apt.matricula,
        nombre: apt.nombre,
        id: apt.matricula,
        estatus: apt.status === "C" ? "C" : "A",
      }]);
    } else {
      setSelectedPatients([]);
    }

    setIsModalOpen(true);
    setIsPanelOpen(true);
  };

  const toHora24 = (hora: number | string, periodo: string): number => {
    const h = parseInt(String(hora));
    if (periodo === "AM" && h === 12) return 0;
    if (periodo === "PM" && h !== 12) return h + 12;
    return h;
  };

  const toStr = (h: number): string => {
    const mins = Math.round((h % 1) * 60);
    const hInt = Math.floor(h);
    const p    = hInt >= 12 ? "PM" : "AM";
    const h12  = hInt % 12 === 0 ? 12 : hInt % 12;
    return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${p}`;
  };

  // const selectedDiaIndex = parseInt(String(formData.dia));
  const isDiaPasado = weekDates[parseInt(String(formData.dia))] < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div
          className="max-w-7xl mx-auto px-4 pb-0 flex flex-col gap-6"
          style={{ height: pageHeight }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl shadow-xs shadow-restore gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Agenda de Citas
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Control de citas, recordatorios y tiempos.
              </p>
            </div>
            {esPrivilegiado && (
              <div className="flex items-center gap-2">
                {/* <button
                  onClick={() => { setGruposModalOpen(true); fetchGrupos(); }}
                  className="flex items-center justify-center bg-white hover:bg-gray-50 hover:-translate-y-1 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all cursor-pointer "
                >
                  <i className="mdi mdi-account-group mr-2"></i>
                  Grupos
                  {savedGroups.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-sea-blue text-white rounded-full px-1.5 py-0.5 leading-none">
                      {savedGroups.length}
                    </span>
                  )}
                </button> */}
                <button
                  onClick={() => openPanel()}
                  className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs mr-2"></i>
                  Agendar
                </button>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            // className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <div className="flex flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out">
              <aside className="w-50 shrink-0 bg-white flex flex-col overflow-y-auto">
                {/* bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0 */}
                <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
                  <i className="fa-solid fa-calendar-week text-sea-blue mr-3"></i>
                  Calendario
                </h2>
                <div className="select-none mt-3 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <button
                      onClick={() => miniView === "days" ? setMiniMonthOffset((o) => o - 1) : setMiniMonthOffset((o) => o - 12)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMiniView(v => v === "days" ? "months" : "days")}
                      className="p-1.5 rounded-md text-xs font-semibold text-gray-700 bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {miniView === "days" ? `${miniMonthCap} ${miniYear}` : `${miniYear}`}
                    </button>
                    <button
                      onClick={() => miniView === "days" ? setMiniMonthOffset((o) => o + 1) : setMiniMonthOffset((o) => o + 12)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {miniView === "months" ? (
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => {
                        const isCurrentMonth = i === now.getMonth() && miniYear === now.getFullYear();
                        const isSelectedMonth = i === selectedDate.getMonth() && miniYear === selectedDate.getFullYear();
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              const targetOffset = (miniYear - now.getFullYear()) * 12 + i - now.getMonth();
                              setMiniMonthOffset(targetOffset);
                              setMiniView("days");
                            }}
                            className={`py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer
                              ${isSelectedMonth ? "bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 text-white" : isCurrentMonth ? "bg-sky-blue text-white font-bold" : "text-gray-700 hover:bg-gray-100"}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 mb-1">
                        {["L","M","M","J","V","S","D"].map((d, i) => (
                          <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-0.5">
                        {miniDays.map(({ date, isCurrentMonth }, i) => {
                          const thisWeekMonday = getMonday(date);
                          const currentWeekMonday = getMonday(now);
                          const viewWeekMonday = new Date(getMonday(now));
                          viewWeekMonday.setDate(viewWeekMonday.getDate() + weekOffset * 7);

                          const isToday = date.toDateString() === now.toDateString();
                          const isCurrentWeek = thisWeekMonday.getTime() === currentWeekMonday.getTime();
                          const isInViewWeek = thisWeekMonday.getTime() === viewWeekMonday.getTime();
                          const esFestivo = isCurrentMonth && diasFestivos.some(
                            f => f.dia === date.getDate() && f.mes === date.getMonth() + 1 && f.anio === date.getFullYear()
                          );

                          const dayOfWeek = date.getDay();
                          const isWeekStart = dayOfWeek === 1;
                          const isWeekEnd   = dayOfWeek === 0;

                          return (
                            <button
                              key={i}
                              onClick={() => handleMiniDayClick(date)}
                              className={`h-6 w-full text-[11px] font-medium transition-colors flex items-center justify-center cursor-pointer relative
                                ${isCurrentWeek
                                  ? `bg-horz-blue/10 border-y border-horz-blue/50 shadow-xs
                                    ${isWeekStart ? "border-l rounded-l" : ""}
                                    ${isWeekEnd   ? "border-r rounded-r" : ""}`
                                  : isInViewWeek ? "bg-gray-100" : "hover:bg-gray-100/80"
                                }
                              `}
                            >
                              <span
                                title={`${esFestivo ? "Festivo" : ""}`}
                                className={`h-6 w-6 flex items-center justify-center
                                  ${esFestivo ? "bg-gray-200 font-bold"
                                  : isToday ? "rounded-full bg-linear-to-b from-sea-blue to-sky-blue text-white font-bold"
                                  : !isCurrentMonth ? "text-gray-300"
                                  : "rounded-full text-gray-700"
                                  }
                                `}
                              >
                                {date.getDate()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {diasFestivos.some(f => f.mes === miniMonth + 1 && f.anio === miniYear) && (
                    <div className="mt-auto pt-2 px-1 space-y-1">
                      {diasFestivos
                        .filter(f => f.mes === miniMonth + 1 && f.anio === miniYear)
                        .sort((a, b) => a.dia - b.dia)
                        .map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="shrink-0 flex items-center justify-center bg-gray-200 text-[11px] font-bold leading-none w-[18px] h-[18px] text-center">
                              {f.dia}
                            </span>
                            <span className="text-[10px] text-gray-600 leading-none flex items-center">
                              {f.nombre}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </aside>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
                <div className="flex items-center gap-3 mb-4 shrink-0 rounded-t-xl">
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      title="Anterior"
                      onClick={() => setWeekOffset((o) => o - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                    title="Siguiente"
                      onClick={() => setWeekOffset((o) => o + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg shadow-xs overflow-hidden">
                  <div className="flex shrink-0 relative">
                    {/* border-b border-gray-100 */}
                    {/* shadow-md */}
                    <div className="w-14 shrink-0 flex items-center justify-center">
                      <button
                        onClick={goToToday}
                        className="ml-1 px-2 py-1 border border-gray-100 rounded text-xs font-medium text-gray-700  hover:bg-gray-50 cursor-pointer"
                      >
                        Hoy
                      </button>
                    </div>

                    {weekDates.map((d, i) => {
                      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center py-2"
                        >
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                            {dayNames[d.getDay()]}
                          </span>
                          <span
                            className={`mt-0.5 text-sm font-bold flex items-center justify-center h-7 w-7 rounded-full transition-colors
                            ${isToday ? "bg-linear-to-b from-sea-blue to-sky-blue text-white" : "text-gray-800"}`}
                          >
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                    <div className="w-3.5 bg-transparent"></div>
                  </div>

                  {appointments.some(a => a.type === "VAC" || a.type === "IMSS" || a.type === "IND") && (
                    <div className="flex shrink-0 shadow-xs" style={{ minHeight: 36 }}>
                      <div className="w-14 shrink-0 flex items-center justify-end pr-2">
                      </div>
                      {weekDates.map((_, colIdx) => {
                        const bannerApts = appointments.filter(a => (a.type === "VAC" || a.type === "IMSS" || a.type === "IND") && a.dia === colIdx);
                        const isColToday = weekDates[colIdx].getDate() === now.getDate() && weekDates[colIdx].getMonth() === now.getMonth() && weekDates[colIdx].getFullYear() === now.getFullYear();
                        return (
                          <div
                            key={colIdx}
                            className={`flex-1 flex flex-col gap-0.5 py-1 px-1 last:border-0 ${isColToday ? "bg-sky-blue/5" : ""}`}
                          >
                            {bannerApts.map(apt => {
                              const label = apt.type === "IND" ? "Indicadores TNG Sano" : apt.type === "IMSS" ? "Jornada PrevenIMSS" : "Campaña de vacunación";
                              // const icon = apt.type === "IND" ? "mdi-clipboard-text" : apt.type === "IMSS" ? "mdi-security" : "mdi-star";
                              const canClick = esPrivilegiado;
                              return (
                                <motion.div
                                  key={`banner-${apt.id}`}
                                  initial={{ opacity: 0, y: -3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  onClick={() => { if (!esPrivilegiado) return; handleEditAppointment(apt); }}
                                  onMouseEnter={() => setHoveredCardId(apt.id)}
                                  onMouseLeave={() => setHoveredCardId(null)}
                                  className={`relative flex items-start px-2 py-1 rounded-md select-none transition-all text-white bg-linear-to-r ${apt.type === "IMSS" ? "from-[#006657] to-[#00bb9f]" : "from-sea-blue to-sky-blue"} ${esPrivilegiado ? "cursor-pointer" : "cursor-default"} max-w-[134px]`}
                                  // border border-sky-blue/40
                                >
                                  <div className="flex flex-col w-full">
                                    <span className="text-[8px] opacity-70 break-words leading-tight">
                                      {`${toStr(apt.hora)} - ${toStr(apt.hora + apt.duracion)}`}
                                    </span>
                                    <span className="text-[9px] font-semibold uppercase truncate w-full block">
                                      {/* <i className={`mdi ${icon} mr-1`}></i> */}
                                      {label}
                                    </span>
                                  </div>

                                  {hoveredCardId === apt.id && (
                                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-lg p-3 pointer-events-none z-[1000] shadow-lg text-left">
                                      <div className="-mx-3 -mt-3 relative overflow-hidden rounded-t-lg">
                                        <img
                                          src={apt.type === "IND" ? indicador : apt.type === "VAC" ? vacuna : apt.type === "IMSS" ? imss : ""}
                                          className="w-full h-25 object-cover"
                                        />
                                        <div className={`absolute inset-0 ${apt.type === "IMSS" ? "bg-[#006657]/50" : "bg-sea-blue/60"}`}></div>
                                        <div className="absolute bottom-0 left-0 right-0 px-3">
                                          <div className="text-white">
                                            <p className={`text-justify text-[11px] ${apt.type === "IMSS" ? "text-[#DDC9A3]" : "text-horz-blue"} font-bold uppercase leading-tight`}>
                                              {label}
                                            </p>
                                            <p className="text-[10px] uppercase truncate pb-2">
                                              {weekDates[apt.dia]?.toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-1 text-gray-600 pt-2">
                                        {/* {apt.type === "IND" && apt.pacientes && apt.pacientes.length > 0 && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-sea-blue font-semibold">
                                              {`${apt.pacientes.length} paciente${apt.pacientes.length !== 1 ? "s" : ""}`}
                                            </span>
                                          </div>
                                        )} */}
                                        {apt.notas && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-justify text-[10px] break-words">
                                              {apt.notas}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                          <span className={`text-[10px] ${apt.type === "IMSS" ? "text-[#006657]" : "text-sea-blue"} font-bold uppercase truncate`}>
                                            {`${apt.time} A ${toStr(apt.hora + apt.duracion)}`}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })}
                      <div className="w-3.5"></div>
                    </div>
                  )}

                  <div ref={gridScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 rounded-lg">
                    <div className="flex" style={{ minHeight: `${24 * 64}px` }}>
                      <div className="w-14 shrink-0 bg-white sticky left-0">
                        {times.map((t, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-end pr-2 text-[10px] text-gray-400 font-medium`}
                            // ${(t == "8 A.M." || t == "7 P.M.") && "border-t border-sea-blue"}
                            style={{ height: `${64}px` }}
                          >
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 relative flex">
                        {weekDates.map((d, colIdx) => {
                          const isColToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isPastDay = d < now && !isColToday;

                          return (
                            <div
                              key={colIdx}
                              className={`flex-1 relative border border-gray-50 ${isColToday ? "bg-horz-blue/10 border-horz-blue/50 shadow-xs" : isPastDay ? "bg-gray-100/30" : isWeekend ? "" : ""}`}
                              style={{ zIndex: 0 }}
                            >
                              {times.map((_, rowIdx) => {
                                // const isPastDay = d < now && !isColToday;

                                return (
                                  <div
                                    key={rowIdx}
                                    className={`border border-gray-50 transition-colors ${isPastDay ? "cursor-not-allowed" : !esPrivilegiado ? "cursor-default" : "hover:bg-horz-blue/15 cursor-pointer"}`}
                                    style={{ height: `${64}px` }}
                                    onClick={() => {
                                      if (isPastDay || !esPrivilegiado) return;

                                      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                      // Bloquear celda solo si el slot de las :30 de esa hora ya pasó
                                      const horaActual = now.getHours() + now.getMinutes() / 60;
                                      if (isToday && rowIdx + 0.5 <= horaActual) return;

                                      const periodo = rowIdx >= 12 ? "PM" : "AM";
                                      const hora12 = rowIdx === 0 ? 12 : rowIdx > 12 ? rowIdx - 12 : rowIdx;

                                      openPanel({
                                        dia: String(colIdx),
                                        hora: String(hora12),
                                        periodo,
                                      });
                                    }}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}

                        {(() => {
                          // Separar citas normales (<3h) de jornadas largas (>=3h); VAC, IMSS e IND se muestran en el header
                          const normales = appointments.filter(a => a.duracion < 3 && a.type !== "VAC" && a.type !== "IMSS" && a.type !== "IND" && a.hora >= HOUR_START && a.hora <= HOUR_END);
                          const jornadas = appointments.filter(a => a.duracion >= 3 && a.type !== "VAC" && a.type !== "IMSS" && a.type !== "IND" && a.hora >= HOUR_START && a.hora <= HOUR_END);

                          const cellGroups: Record<string, Appointment[]> = {};
                          normales.forEach(apt => {
                            const key = `${apt.dia}-${Math.floor(apt.hora)}`;
                            if (!cellGroups[key]) cellGroups[key] = [];
                            cellGroups[key].push(apt);
                          });

                          function formatTimeRange(hora24: number, duracion: number): string {
                            return `${toStr(hora24)} - ${toStr(hora24 + duracion)}`;
                          }

                          // Banners de jornada — apilados desde el top por columna de día
                          const jornadasPorDia: Record<number, Appointment[]> = {};
                          jornadas.forEach(apt => {
                            if (!jornadasPorDia[apt.dia]) jornadasPorDia[apt.dia] = [];
                            jornadasPorDia[apt.dia].push(apt);
                          });

                          const BANNER_H = 28; // px por banner
                          const BANNER_GAP = 2;

                          const jornadaBanners = jornadas.map(apt => {
                            const colWidthPct = 100 / weekDates.length;
                            const stackIndex = jornadasPorDia[apt.dia].indexOf(apt);
                            const topPx = (apt.hora - HOUR_START) * 64 + stackIndex * (BANNER_H + BANNER_GAP) + 4;
                            return (
                              <motion.div
                                key={`jornada-${apt.id}`}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => {
                                  if (!esPrivilegiado && apt.matricula !== user?.matricula) return;
                                  handleEditAppointment(apt);
                                }}
                                onMouseEnter={() => setHoveredCardId(apt.id)}
                                onMouseLeave={() => setHoveredCardId(null)}
                                className={`absolute flex items-center gap-1.5 px-2 rounded-sm shadow-sm cursor-pointer border-l-2 transition-all
                                  ${apt.status === "A" ? "bg-blue-50 border-sea-blue text-sea-blue" : apt.status === "C" ? "bg-red-50 border-red-500 text-red-700" : "bg-gray-100 border-gray-400 text-gray-600"}
                                `}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${BANNER_H}px`,
                                  left: `calc(${apt.dia * colWidthPct}% + 1.5px)`,
                                  width: `calc(${colWidthPct}% - 4px)`,
                                  zIndex: hoveredCardId === apt.id ? 50 : 20,
                                  opacity: hoveredCardId === apt.id ? 1 : 0.88,
                                }}
                              >
                                <i className="mdi mdi-calendar-clock text-[10px] shrink-0"></i>
                                <span className="text-[9px] font-bold truncate">{apt.nombre}</span>
                                <span className="text-[8px] opacity-70 shrink-0 ml-auto">{formatTimeRange(apt.hora, apt.duracion)}</span>
                              </motion.div>
                            );
                          });

                          return [...jornadaBanners, ...Object.values(cellGroups).flatMap((group) => {
                            const totalInCell = group.length;

                            return group.map((apt, indexInCell) => {
                              const colWidthPct = 100 / weekDates.length;
                              const cardHeight = Math.max(apt.duracion * 64 - 2, 20);

                              let aptWidthPct: number;
                              let leftOffset: number;

                              if (totalInCell === 1) {
                                aptWidthPct = colWidthPct;
                                leftOffset = 0;
                              } else {
                                aptWidthPct = colWidthPct / totalInCell;
                                leftOffset = indexInCell * aptWidthPct;
                              }
                              // else if (totalInCell === 3) {
                              //   aptWidthPct = colWidthPct / 3;
                              //   leftOffset = indexInCell * aptWidthPct;
                              // } else {
                              //   aptWidthPct = colWidthPct / 4;
                              //   leftOffset = indexInCell * aptWidthPct;
                              // }

                              return (
                                <motion.div
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: hoveredCardId === apt.id ? 1.02 : 1, opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  key={apt.id}
                                  // onClick={() => !isPastDay && handleEditAppointment(apt)}
                                  onClick={() => {
                                    const isPastDay = weekDates[apt.dia] < now && !(weekDates[apt.dia].getDate() === now.getDate() && weekDates[apt.dia].getMonth() === now.getMonth() && weekDates[apt.dia].getFullYear() === now.getFullYear());
                                    // if (isPastDay) return;
                                    if (!esPrivilegiado && apt.matricula !== user?.matricula) return;
                                    handleEditAppointment(apt);
                                  }}

                                  onMouseEnter={() => setHoveredCardId(apt.id)}
                                  onMouseLeave={() => setHoveredCardId(null)}
                                  className={
                                  `absolute rounded-sm shadow-md flex flex-col px-2 ${apt.duracion > 0.5 ? "py-2" : "py-0"} ${!esPrivilegiado && apt.matricula !== user?.matricula ? "cursor-not-allowed" : "cursor-pointer"} overflow-visible group transition-all 
                                    bg-linear-to-b from-white to-gray-50
                                    
                                  `}
                                  // ${apt.status === "A" ? "border-sea-blue/60" : apt.status === "C" ? "border-red-300" : "border-gray-500/50"}
                                  style={{
                                    top: `${(apt.hora - HOUR_START) * 64 + 1}px`,
                                    height: `${cardHeight}px`,
                                    left: `calc(${apt.dia * colWidthPct + leftOffset}% + 1.5px)`,
                                    width: `calc(${aptWidthPct}% - 4px)`,
                                    zIndex: hoveredCardId === apt.id ? 50 : 10,
                                  }}
                                >
                                  <span className={`text-[9px] font-medium uppercase truncate`}>
                                    {/* <i className={`mdi mdi-${apt.status === "A" ? "check-circle" : apt.status === "C" ? "cancel" : "progress-helper"} mr-1`}></i> */}
                                    <i className={`mdi mdi-${apt.status === "A" ? "check-bold" : apt.status === "C" ? "close-thick" : "calendar-blank"} mr-1`}></i>
                                    {apt.status === "A" ? "Completo" : apt.status === "C" ? "Cancelado" : "Agendado"}
                                  </span>
                                  
                                  <span className="text-[11px] font-bold uppercase truncate leading-tight">
                                    {apt.type === "IND" ? "Indicadores TNG sano" : apt.nombre}
                                  </span>
                                  
                                  {/* {apt.duracion > 0.5 && apt.type !== "IND" && (
                                    <span className="text-[10px] uppercase truncate">
                                      {apt.type === "SEG" ? "Seguimiento" : apt.type === "VAC" ? "Campaña de vacunación" : "Periódico"}
                                    </span>
                                  )} */}

                                  <span className={`text-[9px] font-bold truncate`}>
                                    {/* <i className="mdi mdi-timer mr-1"></i> */}
                                    {formatTimeRange(apt.hora, Number(apt.duracion))}
                                  </span>

                                  {hoveredCardId === apt.id && (
                                    <div className={`absolute ${apt.hora < 12 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-45 bg-white border border-gray-200 rounded-lg p-3 pointer-events-none z-[1000] shadow-lg`}>
                                      {/* <div className={`flex items-center ${apt.status == "A" ? "text-sea-blue" : apt.status == "C" ? "text-red-700" : ""} mb-1`}>
                                        <i className={`mdi ${apt.status && apt.status == "A" ? "mdi-check-circle" : apt.status == "C" ? "mdi-cancel" : "mdi-progress-helper"} text-[11px] mr-1`}></i>
                                        <span className="text-[10px] font-semibold uppercase truncate">
                                          {apt.status && apt.status == "A" ? "Completo" : apt.status == "C" ? "Cancelado" : "Agendado"}
                                        </span>
                                      </div> */}
                                      <p className={`text-[11px] font-bold text-gray-700 uppercase truncate leading-tight block max-w-full`}>
                                        {apt.type === "IND" ? "Indicadores TNG sano" : apt.nombre}
                                      </p>
                                      {/* <span className="text-[11px] font-bold text-gray-700 uppercase truncate leading-tight block max-w-full">
                                      </span> */}
                                      <p className="text-[9.5px] uppercase truncate pb-1">
                                        {weekDates[apt.dia]?.toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
                                      </p>
                                      <div className="space-y-1 text-gray-600 pt-2">
                                        <div className="flex items-center gap-1.5">
                                          {/* <span className="text-justify text-[10px] break-words">
                                            {apt.notas}
                                          </span> */}
                                          <span className="text-[10px] truncate">
                                            {/* {apt.type === "SEG" ? "seguimiento" : "periódico"} */}
                                            {apt.notas ? apt.notas : apt.type === "SEG" ? "Seguimiento" : "Periódico"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-bold uppercase truncate`}>
                                          {`${apt.time} A ${toStr(apt.hora + apt.duracion)}`}
                                        </span>
                                      </div>
                                      <div className={`absolute ${apt.hora < 12 ? 'bottom-full border-b-white' : 'top-full border-t-white'} left-1/2 -translate-x-1/2 ${apt.hora < 3 ? '-mb-px' : '-mt-px'} border-4 border-transparent`} />
                                    </div>
                                  )}
                                </motion.div>
                              );
                            });
                          })];
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <aside
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] bg-white border-l border-gray-200 transition-all duration-300 ease-in-out z-40 ${isPanelOpen ? "" : "translate-x-full"}`}
        style={{ width: 420 }}
      >
        {isLoadingEdit && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-xs z-[9999] rounded-lg">
            <div className="flex flex-col items-center gap-3">
              {/* <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-sea-blue border-r-sky-blue border-b-sky-blue/40 animate-spin"></div> */}
              <div className="w-12 h-12 rounded-full animate-spin bg-linear-to-r from-sea-blue to-sky-blue p-[4px]">
                <div className="w-full h-full rounded-full bg-white"></div>
              </div>
            </div>
          </div>
        )}
        <div className="flex h-full w-full">
          <div className="flex flex-col border-r border-gray-100 h-full shrink-0" style={{ width: 420 }}>
            <div className="px-3 py-4 shrink-0 bg-linear-to-r from-white to-gray-100">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <button
                    title={"Regresar"}
                    // className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue bg-linear-to-b hover:from-sea-blue/10 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                    onClick={async () => {
                      if (!isViewMode && editingId) {
                        const originalApt = appointments.find(a => a.id === editingId);
                        if (originalApt) handleEditAppointment(originalApt);
                        else setIsViewMode(true);
                      } else {
                        closePanel();
                      }
                    }}
                  >
                    <i className={`mdi mdi-chevron-${!isViewMode && editingId ? "left" : "right"} text-2xl`}></i>
                  </button>
                  <div>
                    <p className="text-[14px] font-bold text-sea-blue truncate max-w-[320px]">
                      {/* <i className={`mdi mdi-${isViewMode ? "calendar-blank" : editingId ? "calendar-edit" : "calendar-blank"} mr-1.5`}></i> */}
                      {isViewMode ? "Info. de Cita" : editingId ? "Edición de Cita" : "Agendar Cita"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {(() => {
                        const start = weekDates[0];
                        const end = weekDates[6];
                        const fmtDay = (d: Date) => d.getDate();
                        const fmtMonth = (d: Date) => d.toLocaleString("es-ES", { month: "long" }); // .toUpperCase()
                        const fmtYear = (d: Date) => d.getFullYear();

                        if (start.getMonth() === end.getMonth()) { return `${fmtDay(start)} al ${fmtDay(end)} de ${fmtMonth(start)} ${fmtYear(start)}`; }
                        else if (start.getFullYear() === end.getFullYear()) { return `${fmtDay(start)} ${fmtMonth(start)} al ${fmtDay(end)} ${fmtMonth(end)} ${fmtYear(end)}`; }
                        else { return `${fmtDay(start)} ${fmtMonth(start)} ${fmtYear(start)} al ${fmtDay(end)} ${fmtMonth(end)} ${fmtYear(end)}`; }
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1.5">
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                  <i className="mdi mdi-account-circle mr-2"></i>
                  Datos del Paciente
                </h3>
                {editingId && formData.motivo !== "IND" && formData.motivo !== "VAC" && formData.motivo !== "IMSS" && formData.motivo !== "SEG" && formData.motivo !== "PER" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Matrícula
                      </label>
                      <input
                        type="text"
                        value={formData.matricula}
                        disabled
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none border-gray-100 shadow-md bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={formData.patientName}
                        disabled
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none border-gray-100 shadow-md bg-gray-50"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    {formData.motivo === "VAC" || formData.motivo === "IMSS" ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Matrícula / Nombre
                        </label>
                        <div className="w-full border border-gray-100 rounded-lg shadow-md bg-gray-50 cursor-not-allowed px-2 py-2 flex items-center gap-2">
                          <Grip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-xs">
                            TODOS
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          La programación será visible para todos los usuarios.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                            Matrícula / Nombre
                            {selectedPatients.length > 1 && (
                              <span className="text-[10px] text-white bg-sea-blue ml-1 px-[5px] py-0.5 rounded-full leading-none">
                                {selectedPatients.length}
                              </span>
                            )}
                          </label>
                        </div>
                        <div
                          className={`w-full border border-gray-100 rounded-lg shadow-md bg-white ${isViewMode ? "" : "focus-within:border-clinical-blue focus-within:ring-1 focus-within:ring-clinical-blue"}`}
                          onClick={() => !isViewMode && (document.getElementById('mat-search-input') as HTMLInputElement)?.focus()}
                        >
                          {!isViewMode && (
                            <div className="relative flex items-center gap-2 px-2 h-8 cursor-text">
                              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <input
                                id="mat-search-input"
                                type="text"
                                value={matInput}
                                onChange={(e) => setMatInput(e.target.value)}
                                onFocus={() => matSuggestions.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                placeholder="Matrícula / Nombre"
                                className="flex-1 outline-none text-xs bg-transparent placeholder-gray-400"
                              />
                              {matLoadingAuto && (
                                <i className="mdi mdi-loading mdi-spin text-gray-400 text-base shrink-0"></i>
                              )}
                              {showSuggestions && matSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                                  {matSuggestions.map((s, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onMouseDown={() => handleAddPatient(s)}
                                      className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 text-left cursor-pointer"
                                    >
                                      <span className="font-bold text-sea-blue w-10 shrink-0">
                                        {s.matricula}
                                      </span>
                                      <span className="text-gray-500 truncate flex-1">
                                        {s.nombre}
                                      </span>
                                      {String(s.estatus).trim() !== "A" && (
                                        <span className="ml-2 text-[10px] text-red-400 shrink-0">
                                          Inactivo
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {selectedPatients.length > 0 && (
                            <div className="px-2 py-1.5 flex flex-col gap-1 max-h-41 overflow-y-auto">
                              {selectedPatients.map(p => (
                                <span
                                  key={p.matricula}
                                  className="flex items-center gap-2 text-xs text-sea-blue font-semibold bg-linear-to-b from-sky-blue/10 to-horz-blue/5 rounded-md border border-horz-blue/50 shadow-md px-2 py-1 uppercase tracking-wide"
                                >
                                  <span className="font-bold text-sea-blue w-9 shrink-0">
                                    {p.matricula}
                                  </span>
                                  <span className="text-gray-400 font-normal normal-case tracking-normal truncate">
                                    {p.nombre}
                                  </span>
                                  {!isViewMode && (
                                    <button
                                      type="button"
                                      title="Eliminar"
                                      onMouseDown={(e) => { e.preventDefault(); handleRemovePatient(p.matricula); }}
                                      className="ml-auto text-gray-400 hover:text-red-500 transition-colors cursor-pointer leading-none shrink-0"
                                    >
                                      <i className="mdi mdi-close-thick text-[10px]"></i>
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="mdi mdi-calendar-blank mr-2"></i>
                  Detalle de Agenda
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <select
                    className={`w-full border border-gray-100 shadow-md rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none ${isViewMode || selectedPatients.length > 1 ? "bg-gray-50 cursor-not-allowed" : ""}`}
                    value={formData.motivo}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "VAC") setSelectedPatients([]);
                      setFormData(f => ({ ...f, motivo: val }));
                    }}
                    disabled={isViewMode || selectedPatients.length > 1}
                  >
                    <option value="" disabled hidden>Seleccionar</option>
                    <option value="IND">Indicadores TNG sano</option>
                    <option value="SEG" disabled={selectedPatients.length > 1}>Seguimiento</option>
                    <option value="PER" disabled={selectedPatients.length > 1}>Periódico</option>
                    <option value="VAC" disabled={selectedPatients.length > 1}>Campaña de vacunación</option>
                    <option value="IMSS" disabled={selectedPatients.length > 1}>Jornada PrevenIMSS</option>
                  </select>
                  {selectedPatients.length > 1 && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      Las citas múltiples solo aplican para indicadores.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de inicio</label>
                  <input
                    type="date"
                    value={(() => {
                      const d = weekDates[parseInt(String(formData.dia))];
                      return d ? d.toISOString().split("T")[0] : "";
                    })()}
                    min={now.toISOString().split("T")[0]}
                    onChange={(e) => {
                      const dateStr = e.target.value;
                      if (!dateStr) return;
                      const [y, m, d] = dateStr.split("-").map(Number);
                      const sel = new Date(y, m - 1, d);
                      const baseMonday = getMonday(now);
                      const selMonday = getMonday(sel);
                      const diffWeeks = Math.round((selMonday.getTime() - baseMonday.getTime()) / (7 * 24 * 3600 * 1000));
                      const dow = sel.getDay();
                      const dayIndex = dow === 0 ? 6 : dow - 1;
                      if (diffWeeks !== weekOffset) setWeekOffset(diffWeeks);
                      // Validar que no sea pasado
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      if (sel < today) return;
                      setFormData(f => ({ ...f, dia: String(dayIndex) }));
                    }}
                    disabled={isViewMode}
                    className={`w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs ${isViewMode ? "bg-gray-50 cursor-not-allowed" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hora de inicio</label>
                    <select
                      className={`w-full border border-gray-100 shadow-md rounded-lg px-2 py-2 text-xs ${isViewMode ? "bg-gray-50 cursor-not-allowed" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                      value={toHora24(formData.hora, formData.periodo) + formData.minutos / 60}
                      disabled={isViewMode}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const h24 = Math.floor(val);
                        const mins = Math.round((val - h24) * 60);
                        const period = h24 >= 12 ? "PM" : "AM";
                        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
                        setFormData(f => {
                          const currentEnd = toHora24(f.hora, f.periodo) + f.minutos / 60 + f.duracion;
                          const newDur = currentEnd - val > 0 ? currentEnd - val : 0.5;
                          return { ...f, hora: String(h12), minutos: mins, periodo: period, duracion: newDur };
                        });
                      }}
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h24 = Math.floor(i / 2);
                        const mins = i % 2 === 0 ? 0 : 30;
                        const val = h24 + mins / 60;
                        const period = h24 >= 12 ? "PM" : "AM";
                        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
                        const diaDate = weekDates[parseInt(String(formData.dia))];
                        const esHoy = diaDate?.toDateString() === now.toDateString();
                        const horaLimite = now.getHours() + now.getMinutes() / 60;
                        return (
                          <option key={i} value={val} disabled={esHoy && val < horaLimite}>
                            {h12}:{String(mins).padStart(2, "0")} {period}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hora de fin</label>
                    <select
                      className={`w-full border border-gray-100 shadow-md rounded-lg px-2 py-2 text-xs ${isViewMode ? "bg-gray-50 cursor-not-allowed" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                      value={toHora24(formData.hora, formData.periodo) + formData.minutos / 60 + Number(formData.duracion)}
                      disabled={isViewMode}
                      onChange={(e) => {
                        const endVal = Number(e.target.value);
                        const startVal = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
                        const newDur = Math.round((endVal - startVal) * 2) / 2;
                        if (newDur >= 0.5) setFormData(f => ({ ...f, duracion: newDur }));
                      }}
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h24 = Math.floor(i / 2);
                        const mins = i % 2 === 0 ? 0 : 30;
                        const val = h24 + mins / 60;
                        const period = h24 >= 12 ? "PM" : "AM";
                        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
                        const startVal = toHora24(formData.hora, formData.periodo) + formData.minutos / 60;
                        return (
                          <option key={i} value={val} disabled={val <= startVal}>
                            {h12}:{String(mins).padStart(2, "0")} {period}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nota(s)
                  </label>
                  <textarea
                    rows={4}
                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors border-gray-100 shadow-md focus:border-clinical-blue focus:ring-1" ${isViewMode ? "bg-gray-50 cursor-not-allowed" : ""} resize-none`}
                    value={formData.notas}
                    onChange={(e) => { setFormData(f => ({ ...f, notas: e.target.value })); }}
                    disabled={!!isViewMode}
                    placeholder="Nota(s)"
                  />
                </div>
              </div>
            </div>

            {esPrivilegiado && (!editingId || !isDiaPasado) && (
              <div className={`px-5 py-4 shrink-0 flex justify-between items-center gap-3`}>
                {/* ${(editingId || isViewMode) && "gap-3"} */}
                {isViewMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConfirmCita()}
                      className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-account-check mr-2"></i>
                      Asistencia
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoadingEdit(true); setIsViewMode(false);
                        await new Promise(r => setTimeout(r, 1000));
                        setIsLoadingEdit(false);
                      }}
                      className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-50/50 hover:-translate-y-1 text-gray-600 px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-gray-400/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-pencil mr-2"></i>
                      Editar
                    </button>
                  </>
                ) : editingId ? (
                  <>
                    <button
                      onClick={() => handleUpdateCita()}
                      className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-content-save mr-2"></i>
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAppointment(); }}
                      className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-50/50 hover:-translate-y-1 text-sea-blue px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-gray-400/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-cancel mr-2"></i>
                      Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSaveCita()}
                      className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-timer mr-2"></i>
                      Guardar Cita
                    </button>
                    <button
                      type="button"
                      onClick={() => openPanel()}
                      className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-50/50 hover:-translate-y-1 text-sea-blue px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-gray-400/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="mdi mdi-broom mr-2"></i>
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Modal independiente de Grupos ─── */}
      <AnimatePresence>
        {gruposModalOpen && (
          <motion.div
            key="grupos-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setGruposModalOpen(false); }}
          >
            <motion.div
              key="grupos-modal-panel"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-white to-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <i className="mdi mdi-account-group text-sea-blue text-lg"></i>
                  <div>
                    <p className="text-sm font-bold text-gray-800 uppercase">Grupos de Pacientes</p>
                    <p className="text-[10px] text-gray-400">Guarda y reutiliza listas de pacientes</p>
                  </div>
                </div>
                <button
                  onClick={() => setGruposModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Crear nuevo grupo */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <i className="mdi mdi-plus-circle-outline text-sea-blue"></i>
                    Nuevo grupo
                  </p>

                  {/* Input nombre del grupo */}
                  <input
                    type="text"
                    value={mgNombre}
                    onChange={e => setMgNombre(e.target.value)}
                    placeholder="Nombre del grupo..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue mb-2"
                  />

                  {/* Buscador de pacientes del modal */}
                  <div className="w-full border border-gray-200 rounded-lg bg-white focus-within:border-clinical-blue focus-within:ring-1 focus-within:ring-clinical-blue">
                    <div className="relative flex items-center gap-2 px-2 h-8">
                      <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={mgInput}
                        onChange={e => setMgInput(e.target.value)}
                        onFocus={() => mgSuggestions.length > 0 && setMgShowSug(true)}
                        onBlur={() => setTimeout(() => setMgShowSug(false), 150)}
                        placeholder="Buscar matrícula / nombre..."
                        className="flex-1 outline-none text-xs bg-transparent placeholder-gray-400"
                      />
                      {mgLoading && <i className="mdi mdi-loading mdi-spin text-gray-400 text-base shrink-0"></i>}
                      {mgShowSug && mgSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-36 overflow-y-auto">
                          {mgSuggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={() => { setMgPacientes(prev => [...prev, s]); setMgInput(""); setMgShowSug(false); }}
                              className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 text-left cursor-pointer"
                            >
                              <span className="font-bold text-sea-blue w-10 shrink-0">{s.matricula}</span>
                              <span className="text-gray-500 truncate flex-1">{s.nombre}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {mgPacientes.length > 0 && (
                      <div className="px-2 py-1.5 flex flex-col gap-1 max-h-36 overflow-y-auto border-t border-gray-100">
                        {mgPacientes.map(p => (
                          <span key={p.matricula} className="flex items-center gap-2 text-xs text-sea-blue font-semibold bg-linear-to-b from-sky-blue/10 to-horz-blue/5 rounded-md border border-horz-blue/50 px-2 py-1">
                            <span className="font-bold w-9 shrink-0">{p.matricula}</span>
                            <span className="text-gray-400 font-normal truncate">{p.nombre}</span>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setMgPacientes(prev => prev.filter(x => x.matricula !== p.matricula)); }}
                              className="ml-auto text-gray-300 hover:text-red-400 cursor-pointer shrink-0"
                            >
                              <i className="mdi mdi-close-thick text-[10px]"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveNewGroup}
                    disabled={mgSaving || !mgNombre.trim() || mgPacientes.length === 0}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    {mgSaving ? <i className="mdi mdi-loading mdi-spin"></i> : <i className="mdi mdi-content-save-outline"></i>}
                    Guardar grupo ({mgPacientes.length} paciente{mgPacientes.length !== 1 ? "s" : ""})
                  </button>
                </div>

                {/* Lista de grupos guardados */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <i className="mdi mdi-format-list-bulleted text-sea-blue"></i>
                    Grupos guardados
                    {savedGroups.length > 0 && (
                      <span className="ml-1 text-[10px] bg-sea-blue text-white rounded-full px-1.5 py-0.5 leading-none">{savedGroups.length}</span>
                    )}
                  </p>

                  {loadingGroups && (
                    <p className="text-[10px] text-gray-400 text-center py-4 flex items-center justify-center gap-1">
                      <i className="mdi mdi-loading mdi-spin"></i> Cargando grupos...
                    </p>
                  )}
                  {!loadingGroups && savedGroups.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">Sin grupos guardados aún</p>
                  )}
                  <div className="space-y-1">
                    {savedGroups.map(g => (
                      <div key={g.id} className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <i className="mdi mdi-account-group text-gray-400 text-sm shrink-0"></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{g.name}</p>
                          <p className="text-[10px] text-gray-400">{g.patients.length} paciente{g.patients.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setGruposModalOpen(false); openPanel(undefined, g.patients); }}
                          className="text-[10px] font-semibold text-white bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 px-2 py-1 rounded-md cursor-pointer transition-colors shrink-0"
                        >
                          Usar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                        >
                          <i className="mdi mdi-trash-can-outline text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Agenda;