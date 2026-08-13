import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useState } from "react";
import SectionCard from "../features/saludPoblacional/components/shared/SectionCard";
import PacientesTabla, { PacienteResumen } from "../features/saludPoblacional/components/PacientesTabla";

// Mismo skeleton que usa la tabla de Reingresos dentro de Expediente.tsx,
// mientras se carga el directorio completo por primera vez.
const PacientesTablaSkeleton: React.FC = () => (
  <div className="h-[420px] rounded-lg bg-gray-50 overflow-hidden animate-pulse">
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

// Misma tabla y comportamiento que el tab "Reingresos" de Expediente.tsx (clic
// en un renglón -> /Expediente/:matricula, vista de detalle de AnalisisIndividual),
// ahora como página independiente accesible desde el sidebar.
const Reingresos: React.FC = () => {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, {
      method: "POST",
      body: JSON.stringify({ esActivo: "0" }),
    })
      .then((res) => res.json())
      .then((json) => setPacientes(Array.isArray(json?.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener reingresos:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          <SectionCard
            icon="fa-solid fa-arrows-spin"
            title="Reingresos"
            subtitle="Prospectos que formaron parte de la plantilla"
          >
            {loading ? <PacientesTablaSkeleton /> : <PacientesTabla activo={false} pacientes={pacientes} />}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Reingresos;
