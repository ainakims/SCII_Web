import React from "react";
import { DiagnosticoDiferencialItem } from "../types";
import SectionCard from "../../saludPoblacional/components/shared/SectionCard";

interface DiagnosticoSectionProps {
  diagnostico: DiagnosticoDiferencialItem[];
}

// Contenido de mayor profundidad clínica (Nivel D del documento de reglas): el
// propio servicio SOAP decide qué tan detallado regresar `DiagnosticoDiferencial`
// según `esUsuarioMedico` (calculado en el backend a partir del rol del JWT, no
// del cliente) — aquí solo se renderiza lo que haya llegado.
const DiagnosticoSection: React.FC<DiagnosticoSectionProps> = ({ diagnostico }) => (
  <SectionCard icon="code-brackets" title="Diagnóstico diferencial" subtitle="Contenido clínico detallado — visible solo para personal médico">
    {diagnostico.length > 0 ? (
      <div className="flex flex-col gap-2.5">
        {diagnostico.map((d, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 px-3.5 py-3">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-1.5">
              <i className="mdi mdi-notebook-medical-outline text-sea-blue"></i>
              {d.Condicion}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed mb-2"><span className="font-semibold text-gray-500">Evidencia: </span>{d.EvidenciaQueLoRespalda}</p>
            <div className="bg-amber-50 border border-dashed border-amber-300 rounded-lg px-3 py-1.5">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <i className="mdi mdi-flask-outline mr-1"></i>
                <span className="font-semibold">Pendiente: </span>{d.QueFaltaParaConfirmarODescartar}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Sin diagnóstico diferencial disponible para este usuario.</p>
    )}
  </SectionCard>
);

export default DiagnosticoSection;
