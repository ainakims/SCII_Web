import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import IncapacidadesTabla, { IncapacidadPacienteRow } from "../features/incapacidades/components/IncapacidadesTabla";
import IncapacidadModal, { IncapacidadPaciente } from "../features/incapacidades/components/IncapacidadModal";

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

type Vista = "activos" | "inactivos";

// A diferencia de Pacientes.tsx/Reingresos.tsx (que son pantallas
// separadas), aquí Activos/Inactivos conviven en una sola tabla con un
// selector arriba a la derecha del título, ya que ambos grupos son
// candidatos a tener incapacidades que revisar.
const Incapacidad: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);

  const [vista, setVista] = useState<Vista>("activos");
  const [activos, setActivos] = useState<IncapacidadPacienteRow[]>([]);
  const [inactivos, setInactivos] = useState<IncapacidadPacienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [estatusActivo, setEstatusActivo] = useState<Record<string, boolean>>({});
  const [modalPaciente, setModalPaciente] = useState<IncapacidadPaciente | null>(null);

  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));
  useEffect(() => {
    const updateHeight = () => setPageHeight(Math.max(window.innerHeight - 150, 400));
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const ObtenerPacientes = async (): Promise<void> => {
    setLoading(true);
    try {
      const [resActivos, resInactivos] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, { method: "POST", body: JSON.stringify({ esActivo: "1" }) }),
        fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, { method: "POST", body: JSON.stringify({ esActivo: "0" }) }),
      ]);
      const [jsonActivos, jsonInactivos] = await Promise.all([resActivos.json(), resInactivos.json()]);
      setActivos(Array.isArray(jsonActivos?.data) ? jsonActivos.data : []);
      setInactivos(Array.isArray(jsonInactivos?.data) ? jsonInactivos.data : []);
    } catch (err) {
      console.error("Error al obtener pacientes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pendiente de backend: matrículas con una incapacidad activa en este
  // momento, para pintar el estatus en la tabla. Si el endpoint aún no
  // existe o falla, simplemente no se marca ninguna como activa.
  const ObtenerEstatusActivo = async (): Promise<void> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Incapacidades/ObtenerActivas`, { method: "POST" });
      const json = await res.json().catch(() => null);
      const matriculas: string[] = Array.isArray(json?.data) ? json.data : [];
      setEstatusActivo(Object.fromEntries(matriculas.map((m) => [String(m), true])));
    } catch (err) {
      console.error("Error al obtener incapacidades activas:", err);
    }
  };

  // Mismo motivo que en Pacientes.tsx/Reingresos.tsx: evita el doble
  // disparo de StrictMode en la carga inicial.
  const yaSolicitadoRef = useRef(false);
  useEffect(() => {
    if (yaSolicitadoRef.current) return;
    yaSolicitadoRef.current = true;
    ObtenerPacientes();
    ObtenerEstatusActivo();
  }, []);

  const pacientesVista = vista === "activos" ? activos : inactivos;

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
                Incapacidades
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Expediente y control de certificados de incapacidad temporal para el trabajo.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <div className="relative mb-4 shrink-0">
              <h2 className="text-sm font-bold text-gray-800 flex items-center">
                <i className="fa-solid fa-wheelchair-move text-sea-blue mr-3"></i>
                Incapacidad
              </h2>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center gap-1 bg-white border border-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setVista("activos")}
                  className={`w-26 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vista === "activos" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                >
                  <i className="fa-solid fa-user-check text-xs"></i>
                  Activos
                </button>
                <button
                  onClick={() => setVista("inactivos")}
                  className={`w-26 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vista === "inactivos" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                >
                  <i className="fa-solid fa-user-xmark text-xs"></i>
                  Inactivos
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {loading ? (
                <PacientesTablaSkeleton />
              ) : (
                <IncapacidadesTabla
                  pacientes={pacientesVista}
                  fillHeight
                  estatusActivo={estatusActivo}
                  onSeleccionar={(p) => setModalPaciente(p)}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <IncapacidadModal
        open={modalPaciente != null}
        paciente={modalPaciente}
        onClose={() => setModalPaciente(null)}
      />
    </div>
  );
};

export default Incapacidad;
