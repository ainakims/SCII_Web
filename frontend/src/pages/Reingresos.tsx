import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
      </div>
    ))}
  </div>
);

// Misma tabla que antes vivía en el tab "Reingresos" de Dashboard.tsx, ahora
// como página independiente accesible desde el sidebar. El análisis
// individual (clic en un renglón) vive bajo esta misma sección
// (/Reingresos/:matricula, ver basePath en PacientesTabla) en vez de
// /Dashboard/:matricula. El alto de la tabla se mide igual que en
// Pacientes.tsx: ocupa todo el espacio disponible hasta el borde inferior de
// la ventana, en vez de un alto fijo.
const Reingresos: React.FC = () => {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPaciente, setModalPaciente] = useState<Paciente | null>(null);

  // Se recalcula con el zoom/resize para que la card siempre llene el
  // espacio disponible, en vez de quedar congelada hasta la próxima recarga.
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));

  useEffect(() => {
    const updateHeight = () => setPageHeight(Math.max(window.innerHeight - 150, 400));
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const ObtenerReingresos = (): void => {
    fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, {
      method: "POST",
      body: JSON.stringify({ esActivo: "0" }),
    })
      .then((res) => res.json())
      .then((json) => setPacientes(Array.isArray(json?.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener reingresos:", err))
      .finally(() => setLoading(false));
  };

  // Evita que la consulta se dispare más de una vez (React.StrictMode en
  // desarrollo monta/desmonta/vuelve a montar los efectos a propósito). El
  // ref persiste entre ese montaje/desmontaje simulado, así que la segunda
  // invocación del efecto se corta aquí y la petición real (la de la primera
  // invocación) sigue su curso normal hasta resolver.
  const yaSolicitadoRef = useRef(false);

  useEffect(() => {
    if (yaSolicitadoRef.current) return;
    yaSolicitadoRef.current = true;
    ObtenerReingresos();
  }, []);

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
                Reingresos
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Consulta y da seguimiento a los prospectos que formaron parte de la plantilla.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
              <i className="fa-solid fa-arrows-spin text-sea-blue mr-3"></i>
              Reingresos
            </h2>
            <div className="flex-1 min-h-0 flex flex-col">
              {loading ? (
                <PacientesTablaSkeleton />
              ) : (
                <PacientesTabla
                  activo={false}
                  pacientes={pacientes}
                  fillHeight
                  basePath="/Reingresos"
                  onEdit={(p) => { setModalPaciente(p as unknown as Paciente); setModalOpen(true); }}
                  onVerDocumentos={(p) => navigate("/Documentos", { state: { matricula: String(p.Empl_matricula ?? "") } })}
                  onVerEvaluacion={(p) => navigate("/Evaluacion", { state: { matricula: String(p.Empl_matricula ?? "") } })}
                  onVerConsultas={(p) => navigate("/Consultas", { state: { matricula: String(p.Empl_matricula ?? "") } })}
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
        onSaved={ObtenerReingresos}
      />
    </div>
  );
};

export default Reingresos;
