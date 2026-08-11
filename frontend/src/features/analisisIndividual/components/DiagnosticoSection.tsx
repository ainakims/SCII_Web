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
//
// Recuadros sin borde (ni sólido ni punteado): mismo idioma visual que el
// aviso "Requiere atención urgente" de HeaderAnalisis.tsx y el bloque de
// error de AnalisisIndividual.tsx — fondo plano bg-{color}-50, ícono +
// texto en una fila, rounded-lg. Los bordes sólidos/punteados que tenía antes
// no aparecen en ningún otro recuadro de contenido del sistema.
const DiagnosticoSection: React.FC<DiagnosticoSectionProps> = ({ diagnostico }) => (
  <SectionCard icon="clipboard-list" title="Diagnóstico Diferencial" subtitle="Condiciones a considerar según la evidencia disponible">
    {diagnostico.length > 0 ? (
      <div className="flex flex-col gap-2.5">
        {diagnostico.map((d, i) => (
          <div key={i} className="bg-gray-50 rounded-lg px-3.5 py-3">
            <p className="text-xs font-bold text-gray-800 flex items-center mb-1.5">
              <i className="mdi mdi-notebook-medical-outline text-sea-blue"></i>
              {d.Condicion}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed mb-2"><span className="font-semibold text-gray-500">Evidencia: </span>{d.EvidenciaQueLoRespalda}</p>
            <div className="flex items-start gap-2 bg-amber-50 text-amber-700 text-[11px] px-3 py-2 rounded-lg">
              <i className="fa-solid fa-circle-question mt-0.5"></i>
              <p className="leading-relaxed"><span className="font-semibold">Pendiente: </span>{d.QueFaltaParaConfirmarODescartar}</p>
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
