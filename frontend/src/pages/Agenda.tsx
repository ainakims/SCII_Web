import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

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
  duracion: number;
  notas: string;
}

interface StoredPatient {
  matricula?: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

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
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [miniMonthOffset, setMiniMonthOffset] = useState<number>(0);
  const [miniView, setMiniView] = useState<"days" | "months">("days");
  const [loadingMat, setLoadingMat] = useState(false);
  const [matriculaNotFound, setMatriculaNotFound] = useState(false);
  const [matriculaNotRegis, setMatriculaNotRegis] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  // const [loadingCitas, setLoadingCitas] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);

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

  const times: string[] = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return "12 A.M.";
    if (i < 12) return `${i} A.M.`;
    if (i === 12) return "12 P.M.";
    return `${i - 12} P.M.`;
  });

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
    periodo: "AM",
    duracion: 0.00,
    notas: "",
  });

  useEffect(() => {
    if (!formData.matricula) return;
    if (editingId) return;

    const delay = setTimeout(() => {
      (async () => {
        try {
          setLoadingMat(true);
          await new Promise(r => setTimeout(r, 2000));

          const cons = await fetchWithAuth(`${API_BASE_URL}/Consultas/BuscarMatricula`, {
            method: "POST",
            body: JSON.stringify({ matricula: formData.matricula })
          });

          const res = await cons.json();

          if (res && res.data.length > 0) {
            setMatriculaNotFound(false);
            setFormData(prev => ({ ...prev, id: res.data![0].IdPaciente ?? "", patientName: res.data![0].Nombre ?? "", estatus: res.data![0].Empl_status ?? "" }));
            setMatriculaNotRegis(res.data[0].IdPaciente == null);
          } else {
            setMatriculaNotFound(true);
            setMatriculaNotRegis(false);
            setFormData(prev => ({ ...prev, patientName: "" }));
          }
        } catch (err) {
          console.error("Error cargando citas:", err);
        }
         finally {
          setLoadingMat(false);
        }
      })();
    }, 1000);
    return () => clearTimeout(delay);
  }, [formData.matricula]);

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

        const matricula = esPrivilegiado ?  "0" : user?.matricula;

        const cons = await fetchWithAuth(`${API_BASE_URL}/Agenda/ObtenerCitas`, {
          method: "POST",
          body: JSON.stringify({ matricula, inicio, final })
        });

        const res = await cons.json();

        const mapped: Appointment[] = res.data.map((c: any) => {
          const horaOriginal = parseInt(c.Hora);
          let hora24 = horaOriginal;
          if (c.Periodo === "PM" && horaOriginal !== 12) hora24 = horaOriginal + 12;
          if (c.Periodo === "AM" && horaOriginal === 12) hora24 = 0;

          const [year, month, day] = (c.FechaCompleta as string).split("T")[0].split("-").map(Number);

          const diaIndex = localWeekDates.findIndex(d =>
            d.getFullYear() === year &&
            d.getMonth() === month - 1 &&
            d.getDate() === day
          );

          return {
            id: c.IdAgenda,
            matricula: c.Matricula ?? "",
            time: `${horaOriginal} ${c.Periodo}`,
            nombre: c.Nombres ?? `Paciente ${c.IdPaciente}`,
            type: c.Motivo,
            status: c.Estado,
            dia: diaIndex === -1 ? -1 : diaIndex,
            hora: hora24,
            duracion: parseFloat(c.Duracion),
            notas: c.Notas,
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

  const handleSaveCita = async (overrideOverlap: boolean = false) => {
    console.table(formData);

    const validations = [
      // {
      //   condition: !editingId && (matriculaNotRegis || !formData.id),
      //   message: "Debe realizar el registro del <b>paciente</b> en sistema antes de levantar una consulta."
      // },
      {
        condition: !editingId && (matriculaNotFound),
        message: "Debe ingresar una <b>matrícula</b> que se encuentre actualmente activa."
      },
      {
        condition: !editingId && String(formData.estatus).trim() !== "A",
        message: "Debe ingresar una <b>matrícula</b> que se encuentre actualmente activa."
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
        message: "Debe seleccionar el <b>periodo</b> (AM/PM) de la cita."
      },
      {
        condition: Number(formData.duracion) <= 0,
        message: "Debe seleccionar la <b>duración</b> de la cita."
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
          const hora24 = toHora24(formData.hora, formData.periodo);
          const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
          return esHoy && hora24 < horaLimite;
        })(),
        message: "No puede agendar una cita en una <b>hora pasada</b>."
      }
    ];

    const error = validations.find(v => v.condition);

    if (error) {
      errorModal("Error al guardar", error.message);
      return;
    }

    const diaIndex = parseInt(String(formData.dia));
    const selectedDate = weekDates[diaIndex];
    const formatDate = selectedDate.toISOString().split("T")[0];

    // Verificar empalme de citas
    const selectedHora24 = toHora24(formData.hora, formData.periodo);
    const hasOverlap = appointments.find(apt =>
      apt.dia === diaIndex &&
      apt.id !== editingId &&
      apt.hora < selectedHora24 + formData.duracion &&
      apt.hora + apt.duracion > selectedHora24
    );

    if (hasOverlap && !overrideOverlap) {
      confirmOverlap(hasOverlap, () => handleSaveCita(true));
      return;
    }

    console.table(formData);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Agenda/AgregarCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              id: formData.id,
              matricula: formData.matricula,
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: formData.hora,
              periodo: formData.periodo,
              duracion: Number(formData.duracion).toFixed(2),
              notas: formData.notas,
            }
          })
        });

      let data: any = null;

      try { data = await res.json(); } catch { data = null; }

      if (data) {
        exitoModal("Éxito al guardar", "Se han registrado los datos de la cita correctamente.");
        setFetchTrigger(t => t + 1);
        closePanel();
      }
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleUpdateCita = async (overrideOverlap: boolean = false) => {
    if (!editingId) return;

    const diaIndex = parseInt(String(formData.dia));
    const selectedDate = weekDates[diaIndex];
    const formatDate = selectedDate.toISOString().split("T")[0];

    const selectedHora24 = toHora24(formData.hora, formData.periodo);
    const hasOverlap = appointments.find(apt =>
      apt.dia === diaIndex &&
      apt.id !== editingId &&
      apt.hora < selectedHora24 + formData.duracion &&
      apt.hora + apt.duracion > selectedHora24
    );

    if (hasOverlap && !overrideOverlap) {
      confirmOverlap(hasOverlap, () => handleUpdateCita(true));
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Agenda/EdicionCitas`, {
          method: "POST",
          body: JSON.stringify({
            agenda: {
              idAgenda: editingId,
              motivo: formData.motivo,
              fecha: formatDate,
              dia: formData.dia,
              hora: formData.hora,
              periodo: formData.periodo,
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
      iconHtml: `
      <i class="mdi mdi-check-decagram-outline success-icon"></i>
      <style>
        .success-icon {
          color: #54BBAB;
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
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false, 
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass:
      { 
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
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
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
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
      // showCloseButton: true,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i>${confirma}`,
      denyButtonText: `<i class="mdi mdi-close-thick mr-1"></i>${cancelar}`,
      showDenyButton: true,
      customClass: {
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
        denyButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
      },
    })
  };

  const confirmOverlap = (overlapAppointment: Appointment, onConfirm: () => void): void => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Conflicto de horario</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">Ya existe una cita para el día <b>${dayNames[weekDates[overlapAppointment.dia]?.getDay() ?? 0].toLowerCase()} ${weekDates[overlapAppointment.dia]?.getDate()} a las ${overlapAppointment.time}</b>. ¿Desea permitir que se empalmen las citas?</p>`,
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
      // showCloseButton: true,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> Permitir`,
      cancelButtonText: `<i class="mdi mdi-close-thick mr-1"></i> Cancelar`,
      showCancelButton: true,
      customClass: {
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
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
    setFormData({
      id: "",
      matricula: "",
      estatus: "",
      patientName: "",
      motivo: "",
      dia: "0",
      hora: "1",
      periodo: "AM",
      duracion: 0.00,
      notas: "",
    });
  };

  const openPanel = (prefill?: Partial<FormData>): void => {
    setEditingId(null);
    setIsViewMode(false);
    setOverlapWarning(null);
    setMatriculaNotFound(false);
    setMatriculaNotRegis(false);

    // Día actual dentro de la semana visible
    const todayIndex = weekDates.findIndex(d =>
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
    const defaultDia = todayIndex >= 0 ? String(todayIndex) : "0";

    // Próxima hora válida
    const horaLimite24 = Math.min(now.getHours() + (now.getMinutes() > 0 ? 1 : 0), 23);
    const defaultPeriodo = horaLimite24 >= 12 ? "PM" : "AM";
    const defaultHora12 = horaLimite24 === 0 ? 12 : horaLimite24 > 12 ? horaLimite24 - 12 : horaLimite24;

    setFormData({
      id: "",
      matricula: "",
      estatus: "",
      patientName: "",
      motivo: "",
      dia: defaultDia,
      hora: String(defaultHora12),
      periodo: defaultPeriodo,
      duracion: 0.00,
      notas: "",
      ...prefill,
    });
    setIsPanelOpen(true);
  };

  const handleEditAppointment = (apt: Appointment): void => {
    setEditingId(apt.id);
    setIsViewMode(true)

    const hora12 = apt.hora === 0 ? 12 : apt.hora > 12 ? apt.hora - 12 : apt.hora;
    const periodo = apt.hora >= 12 ? "PM" : "AM";

    setFormData({
      id: String(apt.id),
      matricula: apt.matricula,
      estatus: apt.status,
      patientName: apt.nombre,
      motivo: apt.type,
      dia: String(apt.dia),
      hora: String(hora12),
      periodo: periodo,
      duracion: apt.duracion,
      notas: apt.notas,
    });

    setIsModalOpen(true);
    setIsPanelOpen(true);
  };

  const toHora24 = (hora: number | string, periodo: string): number => {
    const h = parseInt(String(hora));
    if (periodo === "AM" && h === 12) return 0;
    if (periodo === "PM" && h !== 12) return h + 12;
    return h;
  };

  // const selectedDiaIndex = parseInt(String(formData.dia));
  const isDiaPasado = weekDates[parseInt(String(formData.dia))] < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="relative flex w-full overflow-hidden">
      <div 
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
        // style={{ marginRight: isPanelOpen ? 420 : 0 }}
      >
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Agenda de Citas
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Control de citas, recordatorios y tiempos.
              </p>
            </div>
            {esPrivilegiado && (
              <button
                onClick={() => openPanel()}
                className="w-35 flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                <i className="mdi mdi-calendar-search mr-2"></i>
                Agendar
              </button>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="flex flex-1 overflow-hidden transition-all duration-300 ease-in-out">
              <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col mt-0 p-3 gap-4 overflow-y-auto">
                <div className="select-none">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <button
                      onClick={() => miniView === "days" ? setMiniMonthOffset((o) => o - 1) : setMiniMonthOffset((o) => o - 12)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMiniView(v => v === "days" ? "months" : "days")}
                      className="p-1.5 rounded-md text-xs font-semibold text-gray-700 hover:text-sea-blue hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {miniView === "days" ? `${miniMonthCap} ${miniYear}` : `${miniYear}`}
                    </button>
                    <button
                      onClick={() => miniView === "days" ? setMiniMonthOffset((o) => o + 1) : setMiniMonthOffset((o) => o + 12)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 cursor-pointer"
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
                              ${isSelectedMonth ? "bg-sea-blue text-white" : isCurrentMonth ? "bg-sky-blue text-white font-bold" : "text-gray-700 hover:bg-gray-100"}`}
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

                          const dayOfWeek = date.getDay();
                          const isWeekStart = dayOfWeek === 1;
                          const isWeekEnd   = dayOfWeek === 0;

                          return (
                            <button
                              key={i}
                              onClick={() => handleMiniDayClick(date)}
                              className={`h-6 w-full text-[11px] font-medium transition-colors flex items-center justify-center cursor-pointer relative
                                ${isCurrentWeek
                                  ? `bg-horz-blue/15 border-y border-horz-blue
                                    ${isWeekStart ? "border-l rounded-l" : ""}
                                    ${isWeekEnd   ? "border-r rounded-r" : ""}`
                                  : isInViewWeek ? "bg-gray-100" : "hover:bg-gray-100/80"
                                }
                              `}
                            >
                              <span className={`h-6 w-6 flex items-center justify-center rounded-full
                                ${isToday
                                  ? "bg-sea-blue text-white font-bold"
                                  : !isCurrentMonth
                                  ? "text-gray-300"
                                  : "text-gray-700"
                                }
                              `}>
                                {date.getDate()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </aside>
              
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="flex items-center gap-3 p-6 border-b border-gray-200 bg-white shrink-0">
                  <div className="flex items-center gap-1">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                      <i className="mdi mdi-calendar-blank mr-4"></i>
                      Calendario
                    </h2>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setWeekOffset((o) => o - 1)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setWeekOffset((o) => o + 1)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 370px)" }}>
                  <div className="flex border-b border-gray-200 bg-white shrink-0 relative">
                    <div className="w-14 shrink-0 flex items-center justify-center">
                      <button
                        onClick={goToToday}
                        className="ml-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Hoy
                      </button>
                    </div>
                    
                    {weekDates.map((d, i) => {
                      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center py-2 border-r border-gray-100"
                        >
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                            {dayNames[d.getDay()]}
                          </span>
                          <span
                            className={`mt-0.5 text-sm font-bold flex items-center justify-center h-7 w-7 rounded-full transition-colors
                            ${isToday ? "bg-sea-blue text-white" : "text-gray-800"}`}
                          >
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                    <div className="flex" style={{ minHeight: `${24 * 64}px` }}>
                      <div className="w-14 shrink-0 border-r border-gray-200 bg-white sticky left-0">
                        {times.map((t, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-end pr-2 text-[10px] text-gray-400 font-medium"
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
                              className={`flex-1 relative border-r border-gray-100 ${isColToday ? "bg-horz-blue/15 border border-horz-blue" : isPastDay ? "bg-gray-100/30" : isWeekend ? "" : ""}`}
                              style={{ zIndex: 0 }}
                            >
                              {times.map((_, rowIdx) => {
                                // const isPastDay = d < now && !isColToday;
                                
                                return (
                                  <div
                                    key={rowIdx}
                                    className={`border-b border-gray-100 transition-colors ${isPastDay ? "cursor-not-allowed" : !esPrivilegiado ? "cursor-default" : "hover:bg-horz-blue/15 cursor-pointer"}`}
                                    style={{ height: `${64}px` }}
                                    onClick={() => {
                                      if (isPastDay || !esPrivilegiado) return;

                                      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                      const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
                                      if (isToday && rowIdx < horaLimite) return;

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
                          const cellGroups: Record<string, Appointment[]> = {};

                          appointments.forEach(apt => {
                            const key = `${apt.dia}-${apt.hora}`;
                            if (!cellGroups[key]) cellGroups[key] = [];
                            cellGroups[key].push(apt);
                          });

                          return Object.values(cellGroups).flatMap((group) => {
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
                                  `absolute rounded-sm border flex flex-col px-2 ${apt.duracion > 0.5 ? "py-2" : "py-0"} ${!esPrivilegiado && apt.matricula !== user?.matricula ? "cursor-not-allowed" : "cursor-pointer"} overflow-visible group transition-all
                                    ${apt.status === "A" ? "text-sea-blue border-sea-blue/50 bg-sea-blue/5" : apt.status === "C" ? "text-red-700 border-red-700/50 bg-red-50" : "text-gray-600 border-gray-500 bg-gray-50"}
                                  `}
                                  style={{
                                    top: `${apt.hora * 64 + 1}px`,
                                    height: `${cardHeight}px`,
                                    left: `calc(${apt.dia * colWidthPct + leftOffset}% + 1.5px)`,
                                    width: `calc(${aptWidthPct}% - 4px)`,
                                    zIndex: hoveredCardId === apt.id ? 50 : 10,
                                  }}
                                >
                                  <span className="text-[10px] font-semibold truncate">
                                    <i className="mdi mdi-timer mr-1"></i>
                                    {apt.time} ({apt.duracion} HR)
                                  </span>
                                  <span className="text-[11px] font-bold truncate leading-tight">
                                    {apt.nombre}
                                  </span>
                                  {apt.duracion > 0.5 && (
                                    <span className="text-[10px] uppercase truncate">
                                      {apt.type === "IND" ? "Indicadores TNG sano" : apt.type == "SEG" ? "Seguimiento" : "Periódico"}
                                    </span>
                                  )}
                                  
                                  {hoveredCardId === apt.id && (
                                    <div className={`absolute ${apt.hora < 12 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-45 bg-white border border-gray-200 rounded-lg p-3 pointer-events-none z-[1000] shadow-lg`}>
                                      <div className={`flex items-center ${apt.status == "A" ? "text-sea-blue" : apt.status == "C" ? "text-red-700" : ""} mb-1`}>
                                        <i className={`mdi ${apt.status && apt.status == "A" ? "mdi-check-circle" : apt.status == "C" ? "mdi-cancel" : "mdi-progress-helper"} text-[11px] mr-1`}></i>
                                        <span className="text-[10px] font-semibold uppercase truncate">
                                          {apt.status && apt.status == "A" ? "Completo" : apt.status == "C" ? "Cancelado" : "Agendado"}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-bold text-gray-700 truncate leading-tight block max-w-full">
                                        {apt.nombre}
                                      </span>
                                      <div className="space-y-0.5 pt-2 text-xs text-gray-600">
                                        <div className="flex items-center">
                                          <i className="mdi mdi-calendar-blank mr-2"></i>
                                          <span className="text-[10px] uppercase truncate">
                                            {weekDates[apt.dia]?.toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="flex items-center">
                                          <i className="mdi mdi-clock-outline mr-2"></i>
                                          <span className="text-[10px] uppercase truncate">
                                            {/* {apt.time.split(' ')[0].padStart(2, '0')}:00 {apt.time.split(' ')[1]} ({apt.duracion} HR) */}
                                            {apt.time} ({apt.duracion} HR)
                                          </span>
                                        </div>
                                        <div className="flex items-center">
                                          <i className="mdi mdi-chat mr-2"></i>
                                          <span className="text-[10px] uppercase truncate">
                                            {apt.type === "IND" ? "Indicadores TNG sano" : apt.type == "SEG" ? "Seguimiento" : "Periódico"}
                                          </span>
                                        </div>
                                        
                                      </div>
                                      <div className={`absolute ${apt.hora < 12 ? 'bottom-full border-b-white' : 'top-full border-t-white'} left-1/2 -translate-x-1/2 ${apt.hora < 3 ? '-mb-px' : '-mt-px'} border-4 border-transparent`} />
                                    </div>
                                  )}
                                </motion.div>
                              );
                            });
                          });
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
              <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-sea-blue animate-spin"></div>
            </div>
          </div>
        )}
        <div className="flex h-full w-full">
          <div className="flex flex-col border-r border-gray-100 h-full shrink-0" style={{ width: 420 }}>
            <div className="px-3 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    title={"Regresar"}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                    onClick={async () => { 
                      if (!isViewMode && editingId) {
                        setIsLoadingEdit(true);
                        setIsViewMode(true);
                        await new Promise(r => setTimeout(r, 1000));
                        setIsLoadingEdit(false); 
                      } else {
                        closePanel();
                      }
                    }}
                  >
                    <i className={`mdi mdi-chevron-${!isViewMode && editingId ? "left" : "right"} text-2xl`}></i>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 upp flex items-center">
                      <i className={`mdi mdi-${isViewMode ? "calendar-blank" : editingId ? "calendar-edit" : "calendar-blank"} mr-1.5`}></i>
                      {isViewMode ? "Info. de Cita" : editingId ? "Edición de Cita" : "Agendar Cita"}
                    </h2>
                    <p className="text-xs text-gray-500 truncate font-medium">
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
                {/* <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                  <i className="mdi mdi-bell-ring mr-2"></i>
                   Info. de Difusión
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo de Alerta
                  </label>
                  <div className="relative">
                    <LibraryBig className={`h-4 w-4 absolute left-3 top-2 text-gray-400`} />
                    <select
                      className={`w-full border pl-9 border-gray-300 rounded-lg px-2 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`} 
                    >
                      <option value="G">General</option>
                      <option value="I" selected>Individual</option>
                    </select>
                  </div>
                </div> */}
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                  <i className="mdi mdi-account mr-2"></i>
                  Datos del Paciente
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Matrícula
                  </label>
                  <div className="relative">
                    <Search className={`h-3.5 w-3.5 absolute left-3 top-2.5 ${!formData.matricula ? "text-gray-400" : loadingMat ? "text-gray-400" : matriculaNotFound ? "text-red-500" : matriculaNotRegis ? "text-yellow-500" : "text-gray-400"}`} />
                    <input
                      type="text"
                      value={formData.matricula}
                      onChange={editingId ? () => {} : handleSearchPatient}
                      placeholder="Matrícula (5 dígitos)"
                      disabled={!!editingId || loadingMat || isViewMode}
                      maxLength={5}
                      className={`w-full border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors ${editingId ? "bg-gray-50" : ""} ${!formData.matricula ? "border-gray-300" : loadingMat ? "border-gray-300 bg-gray-100" : matriculaNotFound ? "border-red-200 bg-red-50 text-red-500" : matriculaNotRegis ? "border-yellow-300 bg-yellow-50 text-yellow-500" : "border-gray-300 focus:border-clinical-blue focus:ring-1"}`}
                    />
                    {loadingMat && !editingId &&
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <i className="mdi mdi-loading mdi-spin text-gray-400 text-lg"></i>
                      </div>
                    }
                  </div>
                  {(matriculaNotRegis || matriculaNotFound) && (
                    <p className={`text-xs mt-1 ${matriculaNotRegis ? "text-yellow-500" : "text-red-500"}`}>
                      {matriculaNotRegis ? "La matrícula se encuentra activa sin registrar en sistema." : "La matrícula no se encuentra actualmente activa."}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.patientName}
                    disabled
                    onChange={(e) => { setFormData(f => ({ ...f, patientName: e.target.value }));}}
                    placeholder="Nombre"
                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors border-gray-300 bg-gray-50 focus:border-clinical-blue focus:ring-1`}
                  />
                </div>
                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="mdi mdi-calendar-blank mr-2"></i>
                  Detalle de Agenda
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <select 
                    className={`w-full border border-gray-300 rounded-lg px-2 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`} 
                    value={formData.motivo}
                    onChange={(e) => { setFormData(f => ({ ...f, motivo: e.target.value }));}}
                    disabled={isViewMode}
                  >
                    <option value="" disabled hidden>Seleccionar</option>
                    <option value="IND">Indicadores TNG sano</option>
                    <option value="SEG">Seguimiento</option>
                    <option value="PER">Periódico</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Día
                    </label>
                    <select
                      className={`w-full border border-gray-300 rounded-lg px-2 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                      value={formData.dia}
                      onChange={(e) => {
                        const newDia = e.target.value;
                        const diaDate = weekDates[parseInt(newDia)];
                        const esHoy = diaDate?.getDate() === now.getDate() && diaDate?.getMonth() === now.getMonth() && diaDate?.getFullYear() === now.getFullYear();
                        const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);

                        let newHora = formData.hora;
                        let newPeriodo = formData.periodo;

                        if (esHoy) {
                          const horaActual24 = toHora24(formData.hora, formData.periodo);
                          if (horaActual24 < horaLimite) {
                            // La hora/periodo actual ya no es válida, recalcular
                            newPeriodo = horaLimite >= 12 ? "PM" : "AM";
                            const primerValida = Array.from({ length: 12 }, (_, i) => i + 1).find(h => toHora24(h, newPeriodo) >= horaLimite);
                            newHora = primerValida ? String(primerValida) : "12";
                          }
                        }

                        setFormData(f => ({ ...f, dia: newDia, hora: newHora, periodo: newPeriodo }));
                      }}
                      disabled={isViewMode}
                    >
                      {weekDates.map((d, i) => {
                        const esPasado = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        return (
                          <option key={i} value={i} disabled={esPasado}>
                            {dayNames[d.getDay()]} {d.getDate()}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hora
                    </label>
                    <div className="flex space-x-3">
                      <select
                        className={`w-1/2 border border-gray-300 rounded-lg px-1.5 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                        value={formData.hora}
                        onChange={(e) => { setFormData(f => ({ ...f, hora: e.target.value }));}}
                        disabled={isViewMode}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                          const diaSeleccionado = weekDates[parseInt(String(formData.dia))];
                          const esHoy = diaSeleccionado?.getDate() === now.getDate() && diaSeleccionado?.getMonth() === now.getMonth() && diaSeleccionado?.getFullYear() === now.getFullYear();
                          const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
                          const hora24 = toHora24(h, formData.periodo);
                          return (
                            <option key={h} value={h} disabled={esHoy && hora24 < horaLimite}>
                              {h}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        className={`w-1/2 border border-gray-300 rounded-lg px-1.5 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                        value={formData.periodo}
                        onChange={(e) => {
                          const newPeriodo = e.target.value;
                          const diaDate = weekDates[parseInt(String(formData.dia))];
                          const esHoy = diaDate?.getDate() === now.getDate() && diaDate?.getMonth() === now.getMonth() && diaDate?.getFullYear() === now.getFullYear();
                          const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
                          let newHora = formData.hora;
                          if (esHoy) {
                            const primerValida = Array.from({ length: 12 }, (_, i) => i + 1).find(h => toHora24(h, newPeriodo) >= horaLimite);
                            if (primerValida) newHora = String(primerValida);
                          }
                          setFormData(f => ({ ...f, periodo: newPeriodo, hora: newHora }));
                        }}
                        disabled={isViewMode}
                      >
                        {(() => {
                          const diaDate = weekDates[parseInt(String(formData.dia))];
                          const esHoy = diaDate?.getDate() === now.getDate() && diaDate?.getMonth() === now.getMonth() && diaDate?.getFullYear() === now.getFullYear();
                          const horaLimite = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
                          const amDisabled = esHoy && horaLimite > 11;
                          const pmDisabled = esHoy && horaLimite > 23;
                          return (
                            <>
                              <option value="AM" disabled={amDisabled}>A.M.</option>
                              <option value="PM" disabled={pmDisabled}>P.M.</option>
                            </>
                          );
                        })()}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Duración
                  </label>
                  <select
                    className={`w-full border border-gray-300 rounded-lg px-1 py-2 text-xs ${isViewMode ? "bg-gray-50" : editingId ? "" : ""} focus:ring-1 focus:ring-sea-blue outline-none`}
                    // value={formData.duracion}
                    value={Number(formData.duracion).toFixed(2)}
                    onChange={(e) => { setFormData(f => ({ ...f, duracion: Number(e.target.value) })); }}
                    disabled={isViewMode}
                  >
                    <option value="0.00" disabled hidden>Seleccionar</option>
                    <option value="0.50">½ Hora</option>
                    <option value="1.00">1 Hora</option>
                    <option value="1.50">1 ½ Hora</option>
                    <option value="2.00">2 Horas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nota(s)
                  </label>
                  <textarea
                    rows={2}
                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors border-gray-300 focus:border-clinical-blue focus:ring-1" ${isViewMode ? "bg-gray-50" : ""} resize-none`}
                    value={formData.notas}
                    onChange={(e) => { setFormData(f => ({ ...f, notas: e.target.value })); }}
                    disabled={!!isViewMode}
                    placeholder="Nota(s)"
                  />
                </div>
              </div>
            </div>
                  
            {esPrivilegiado && (!editingId || !isDiaPasado) && (
              <div className={`px-5 py-4 border-t border-gray-100 shrink-0 flex justify-between items-center ${(editingId || isViewMode) && "gap-3"}`}>
                {isViewMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConfirmCita()}
                      className="w-full flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
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
                      className="w-full flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
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
                  <button
                    onClick={() => handleSaveCita()}
                    className="w-full flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <i className="mdi mdi-calendar-clock mr-2"></i>
                    Guardar Cita
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Agenda;