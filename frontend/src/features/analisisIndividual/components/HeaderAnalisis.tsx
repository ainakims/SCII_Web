import React from "react";
import { PrioridadYUrgencia, AptitudLaboral } from "../types";
import { ESTILOS_PRIORIDAD } from "../colores";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";

interface HeaderAnalisisProps {
  prioridad: PrioridadYUrgencia;
  aptitud: AptitudLaboral;
  matricula?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Rango { inicio: number; fin: number; }

// El SOAP externo regresa `Justificacion`/`Recomendacion` como texto libre,
// sin un campo "Puesto" separado — así que no hay forma 100% confiable de
// saber qué parte del párrafo es el puesto. Esta es una heurística: busca
// frases "puesto de/como X" o "puesto: X" y marca X para ponerlo en negritas.
// Puede no detectar nada si la IA redacta distinto, pero no rompe nada si falla.
function encontrarRangosPuesto(texto: string): Rango[] {
  const rangos: Rango[] = [];
  const regex = /\bpuesto\s+(?:de|como)\s+([^.,;]+?)(?=\s+(?:que|el cual|la cual|ya que|dado que|porque|requiere|implica|conlleva|involucra)\b|[.,;]|$)|\bpuesto\s*:\s*([^.,;]+?)(?=[.,;]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    const grupo = m[1] ?? m[2];
    if (!grupo) continue;
    let inicio = m.index + m[0].indexOf(grupo);
    let fin = inicio + grupo.length;
    // Recorta espacios sueltos al inicio/fin del rango capturado.
    while (inicio < fin && /\s/.test(texto[inicio])) inicio++;
    while (fin > inicio && /\s/.test(texto[fin - 1])) fin--;
    if (fin > inicio) rangos.push({ inicio, fin });
  }
  return rangos;
}

// La matrícula sí la conocemos con certeza (viene de la URL), así que su
// resaltado no es heurístico: si aparece literal en el texto, se marca.
function encontrarRangosMatricula(texto: string, matricula?: string): Rango[] {
  if (!matricula?.trim()) return [];
  const rangos: Rango[] = [];
  const regex = new RegExp(escapeRegExp(matricula.trim()), "gi");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    rangos.push({ inicio: m.index, fin: m.index + m[0].length });
  }
  return rangos;
}

// Pone en negritas el puesto (heurística) y la matrícula (exacta) dentro de
// un texto libre, sin duplicar ni romper el resto del párrafo.
function resaltarPuestoYMatricula(texto: string, matricula?: string): React.ReactNode {
  const rangos = [...encontrarRangosPuesto(texto), ...encontrarRangosMatricula(texto, matricula)].sort((a, b) => a.inicio - b.inicio);

  const rangosFinal: Rango[] = [];
  let cursor = 0;
  for (const r of rangos) {
    if (r.inicio < cursor) continue; // descarta rangos que se solapan con uno ya aceptado
    rangosFinal.push(r);
    cursor = r.fin;
  }

  if (rangosFinal.length === 0) return texto;

  const partes: React.ReactNode[] = [];
  let pos = 0;
  rangosFinal.forEach((r, i) => {
    if (r.inicio > pos) partes.push(texto.slice(pos, r.inicio));
    partes.push(<strong key={i}>{texto.slice(r.inicio, r.fin)}</strong>);
    pos = r.fin;
  });
  if (pos < texto.length) partes.push(texto.slice(pos));
  return partes;
}

// Mismo estilo de badge que QualityBadge.tsx (NIVEL_ESTILOS): degradado
// bg-linear-to-r teñido, rounded-lg, mayúsculas, SIN borde — no el pill
// rounded-full con borde que llevaban antes, que no es como se ven las demás
// badges del sistema.
const badgeCls = "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 w-fit";

const ESTILO_APTITUD = {
  apto: "bg-linear-to-r from-aqua-green/30 to-aqua-green/10 text-green-900",
  noApto: "bg-linear-to-r from-red-200 to-red-100/50 text-red-600",
};

// Mismo shell que SectionCard (rounded-xl shadow-xl p-6, header con ícono +
// título text-sm font-bold + badge a la derecha) y mismo idioma de recuadros
// internos que el resto del dashboard (fondo plano, sin borde sólido ni
// punteado). Íconos de Font Awesome en azul marino (text-sea-blue), igual que
// el resto de los títulos de card del sitio. La única diferencia intencional
// es que, al tratarse de un dictamen apto/no apto, la card completa toma un
// tinte verde o rojo bien visible (no un degradado que se pierde hacia blanco).
const HeaderAnalisis: React.FC<HeaderAnalisisProps> = ({ prioridad, aptitud, matricula }) => (
  <div className="flex flex-col gap-4">
    <div className={`relative overflow-hidden rounded-xl shadow-xl p-6 bg-linear-to-b ${aptitud.Apto ? "from-aqua-green/40 to-aqua-green/15" : "from-red-200/50 to-red-100/20"}`}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-sm font-bold text-gray-800 flex items-center">
          <i className="fa-solid fa-circle-nodes text-sea-blue mr-3"></i>
          Evaluación de Aptitud Laboral
        </h2>
        <span className={`${badgeCls} ${aptitud.Apto ? ESTILO_APTITUD.apto : ESTILO_APTITUD.noApto}`}>
          <i className={`fa-solid ${aptitud.Apto ? "fa-check" : "fa-xmark"}`}></i>
          {aptitud.Apto ? "Apto" : "No apto"}
        </span>
      </div>
      <p className="text-[13px] text-gray-700 leading-relaxed mb-2.5"><span className="font-bold">Puesto: </span>{resaltarPuestoYMatricula(aptitud.Justificacion, matricula)}</p>
      {aptitud.FactoresDeRiesgoDetectados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {aptitud.FactoresDeRiesgoDetectados.map((f, i) => (
            <span key={i} className="px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase bg-linear-to-r from-red-200 to-red-100/50 text-red-700">{f}</span>
          ))}
        </div>
      )}
      <div className="bg-white rounded-lg px-3 py-2">
        <p className="text-[12px] text-gray-700 leading-relaxed"><span className="font-bold">Recomendación: </span>{resaltarPuestoYMatricula(aptitud.Recomendacion, matricula)}</p>
      </div>
      <ShimmerOverlay subtle />
    </div>

    <div className="rounded-xl shadow-xl p-6 bg-linear-to-b from-white to-gray-50">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-sm font-bold text-gray-800 flex items-center">
          <i className="fa-solid fa-triangle-exclamation text-sea-blue mr-3"></i>
          Nivel de Prioridad Médica
        </h2>
        <span className={`${badgeCls} ${ESTILOS_PRIORIDAD[prioridad.Prioridad]}`}>
          Prioridad {prioridad.Prioridad}
        </span>
      </div>
      {prioridad.Urgente && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg mb-2">
          <i className="fa-solid fa-circle-exclamation"></i>
          Requiere atención urgente
        </div>
      )}
      <p className="text-[13px] text-gray-600 leading-relaxed mb-2.5">{prioridad.Justificacion}</p>
      <div className="bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
        <p className="text-[12px] leading-relaxed"><span className="font-bold">Plan sugerido: </span>{prioridad.Recomendacion}</p>
      </div>
    </div>
  </div>
);

export default HeaderAnalisis;
