import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import PacientesTabla, { PacienteResumen } from "../features/saludPoblacional/components/PacientesTabla";
import PacienteRegistroModal, { Paciente } from "../features/saludPoblacional/components/PacienteRegistroModal";

const PacientesTablaSkeleton: React.FC = () => (
  <div className="h-full rounded-lg bg-gray-50 overflow-hidden animate-pulse">
    <div className="h-10 bg-linear-to-r from-white to-gray-100"></div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex items-center gap-5 px-5 py-3 border-b border-gray-100 last:border-0">
        <div className="h-3 w-14 rounded bg-gray-200"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 rounded bg-gray-200"></div>
          <div className="h-2.5 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="h-3 w-28 rounded bg-gray-200"></div>
        <div className="h-3 w-24 rounded bg-gray-200"></div>
        <div className="h-3 w-16 rounded bg-gray-200"></div>
      </div>
    ))}
  </div>
);

const Pacientes: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);
    
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalPaciente, setModalPaciente] = useState<Paciente | null>(null);
  // Se recalcula con el zoom/resize para que la card siempre llene el
  // espacio disponible, en vez de quedar congelada hasta la próxima recarga.
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));

  useEffect(() => {
    const updateHeight = () => setPageHeight(Math.max(window.innerHeight - 150, 400));
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const [loadingPacientes, setLoadingPacientes] = useState<boolean>(false);

  // Mismo motivo que proveedorSolicitadoRef: evita el doble disparo de
  // StrictMode en la carga inicial de pacientes.
  const pacientesSolicitadosRef = useRef(false);
  useEffect(() => {
    if (pacientesSolicitadosRef.current) return;
    pacientesSolicitadosRef.current = true;
    ObtenerPacientes();
  }, []);

  const ObtenerPacientes = async (prevPacientes?: Paciente[]): Promise<void> => {
    setLoadingPacientes(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, {
        method: "POST",
        body: JSON.stringify({ esActivo: "1" }),
      });

      if (res.ok) {
        const json = await res.json();
        const data: Paciente[] = Array.isArray(json.data) ? json.data : [];
        // Si el backend devuelve vacío pero teníamos datos, restaurar la lista anterior
        if (data.length === 0 && prevPacientes && prevPacientes.length > 0) {
          setPacientes(prevPacientes);
        } else {
          setPacientes(data);
        }
      }
    } catch (error) {
      console.error("Error al obtener pacientes:", error);
      // En caso de error conservar la lista anterior
      if (prevPacientes) setPacientes(prevPacientes);
    } finally {
      setLoadingPacientes(false);
    }
  };

  const handleOpenModal = (paciente: Paciente | null = null): void => {
    setModalPaciente(paciente);
    setModalOpen(true);
  };

  const handleDelete = async (id: number | undefined): Promise<void> => {
    const result = await confirmModal("¿Eliminar paciente?", "Si confirma esta acción se <b>eliminará el registro del paciente</b> de forma permanente.");

    if (!result.isConfirmed) {
      return;
    } else {
      // setPacientes(pacientes.filter((p) => p.IdPaciente !== id));

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/EliminaPaciente`, {
          method: "POST",
          body: JSON.stringify({
            id: id,
          })
        });

        const data = await res.json();

        if (data) {
          exitoModal("Paciente eliminado", "El registro del paciente se ha eliminado de forma permanente.");
          ObtenerPacientes();
        }
        else {
          errorModal("No se pudo eliminar", "Ocurrió un error al intentar eliminar el paciente.");
        }
      } catch (err) {
        errorModal("Ocurrió un error", (err as Error).message);
      }
    }
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="fa-solid fa-check success-icon"></i><style> .success-icon { color: #545454; font-size: 90px; animation: pop 0.4s ease-out forwards, popPeriodic 4s ease-in-out 1.5s infinite; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } @keyframes popPeriodic { 0%, 85%, 100% { transform: scale(1); } 90% { transform: scale(1.15); } 95% { transform: scale(0.95); } } </style>`,
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
          font-size: 90px;
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

  const confirmModal = (title: string, message: string) => {
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-question aviso-question"></i>
      <style>
        .aviso-question {
          font-size: 90px;
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
    })
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div
          className="max-w-7xl mx-auto px-4 pb-0 flex flex-col gap-6"
          style={{ height: pageHeight }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl shadow-xs shadow-restore gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent flex items-center">
                Pacientes
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Directorio médico y expedientes clínicos.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-user-plus text-xs mr-2"></i>
              Agregar
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
              <i className="fa-solid fa-user-group text-sea-blue mr-3"></i>
              Pacientes
            </h2>
            <div className="flex-1 min-h-0">
              {loadingPacientes ? (
                <PacientesTablaSkeleton />
              ) : (
                <PacientesTabla
                  activo={true}
                  pacientes={pacientes as PacienteResumen[]}
                  fillHeight
                  basePath="/Pacientes"
                  showFecha={false}
                  onEdit={(p) => handleOpenModal(p as unknown as Paciente)}
                  onDelete={(p) => handleDelete(p.IdPaciente)}
                  onVerDocumentos={(p) => navigate("/Documentos", { state: { matricula: String(p.Empl_matricula ?? "") } })}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <PacienteRegistroModal
        open={modalOpen}
        paciente={modalPaciente}
        onClose={() => setModalOpen(false)}
        onSaved={() => ObtenerPacientes(pacientes)}
      />
    </div>
  );
};

export default Pacientes;

