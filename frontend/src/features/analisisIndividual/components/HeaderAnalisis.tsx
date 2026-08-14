import React, { useState } from "react";
import { PrioridadYUrgencia, AptitudLaboral } from "../types";
import { ESTILOS_PRIORIDAD, ESTILOS_RIESGO_NIVEL, NOMBRE_RIESGO_NIVEL } from "../colores";
import ShimmerOverlay from "../../saludPoblacional/components/shared/ShimmerOverlay";
import logoSano from "../../../assets/img/logo_sano.png";

interface RiesgoReciente {
  nivel: 1 | 2 | 3;
  fecha: Date;
}

interface HeaderAnalisisProps {
  prioridad: PrioridadYUrgencia;
  aptitud: AptitudLaboral;
  matricula?: string;
  // Riesgo (1/2/3) de la toma de indicadores más reciente en SCII_Indicadores
  // para esta matrícula (independiente del análisis de IA) — null si no hay
  // ninguna toma registrada con Riesgo 1/2/3.
  riesgoReciente?: RiesgoReciente | null;
  // Fecha del registro más antiguo disponible de este paciente (consultas,
  // indicadores, etc.) — null si no se pudo determinar. Alimenta la leyenda
  // del periodo analizado, mostrada arriba del título.
  fechaInicioAnalisis?: Date | null;
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
const badgeCls = "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-3 w-fit";

const ESTILO_APTITUD = {
  apto: "bg-linear-to-r from-aqua-green/30 to-aqua-green/10 text-green-900",
  noApto: "bg-linear-to-r from-red-200 to-red-100/50 text-red-600",
};

// Semáforo de 4 niveles que regresa ahora el servicio (antes era un booleano
// `Apto`). Mismo lenguaje de color que el resto del dashboard: verde/rojo
// para los extremos, ámbar para el intermedio, gris neutro para "No evaluable".
const ESTILOS_NIVEL_APTITUD: Record<AptitudLaboral["NivelRiesgo"], { fondo: string; texto: string; acento: string }> = {
  Verde: { fondo: "bg-aqua-green/10", texto: "text-[#3A8277]", acento: "bg-[#3A8277]" },
  Amarillo: { fondo: "bg-amber-100/60", texto: "text-amber-800", acento: "bg-amber-600" },
  Rojo: { fondo: "bg-red-100/50", texto: "text-red-800", acento: "bg-red-700" },
  "No evaluable": { fondo: "bg-gray-100", texto: "text-gray-600", acento: "bg-gray-400" },
};

// Botón "?" junto al badge de dictamen (mismo renglón, no flotando encima).
// Al hacer clic abre un panel angosto con un CriteriosAplicados a la vez
// (pueden ser párrafos largos) y flechas para navegar entre ellos, en vez de
// listarlos todos de un jalón y desbordar la card.
const TogglecriteriosAplicados: React.FC<{ criterios: string[]; acento: string }> = ({ criterios, acento }) => {
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);

  if (criterios.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[11px] shadow-sm ${acento}`}
        aria-label="Ver criterios aplicados"
        aria-expanded={abierto}
      >
        <i className="fa-solid fa-question"></i>
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg bg-white text-gray-700 normal-case font-normal shadow-lg p-3 text-left z-10">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Criterio {indice + 1} de {criterios.length}
            </span>
            {criterios.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIndice((i) => (i - 1 + criterios.length) % criterios.length)}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                  aria-label="Criterio anterior"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setIndice((i) => (i + 1) % criterios.length)}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                  aria-label="Siguiente criterio"
                >
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            )}
          </div>
          <p className="text-[12px] leading-relaxed">{criterios[indice]}</p>
        </div>
      )}
    </div>
  );
};

// Mismo shell que SectionCard (rounded-xl shadow-xl p-6, header con ícono +
// título text-sm font-bold + badge a la derecha) y mismo idioma de recuadros
// internos que el resto del dashboard (fondo plano, sin borde sólido ni
// punteado). Íconos de Font Awesome en azul marino (text-sea-blue), igual que
// el resto de los títulos de card del sitio. La única diferencia intencional
// es que, al tratarse de un dictamen apto/no apto, la card completa toma un
// tinte verde o rojo bien visible (no un degradado que se pierde hacia blanco).
const HeaderAnalisis: React.FC<HeaderAnalisisProps> = ({ prioridad, aptitud, matricula, riesgoReciente, fechaInicioAnalisis }) => (
  <div>
  <div className="flex flex-col gap-4">
    {fechaInicioAnalisis && (
      <div className={`relative overflow-hidden rounded-xl shadow-xs px-6 py-4 mb-4 bg-white text-sea-blue`}>
        <p className="text-[13px] leading-relaxed font-bold opacity-70 flex items-center gap-1.5">
          <i className="fa-solid fa-circle-info mr-3"></i>
          Este análisis se realizó considerando el historial clínico del paciente desde el {fechaInicioAnalisis.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} hasta la fecha actual.
        </p>
      </div>
    )}
  </div>
  <div className="flex flex-col gap-4">
    <div className={`relative overflow-hidden rounded-xl shadow-xs p-6 ${ESTILOS_NIVEL_APTITUD[aptitud.NivelRiesgo].fondo} ${ESTILOS_NIVEL_APTITUD[aptitud.NivelRiesgo].texto}`}>
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <h2 className="text-sm font-bold flex items-center">
          <i className="fa-solid fa-circle-nodes mr-3 animate-spin-periodic"></i>
          Evaluación de Aptitud Laboral
        </h2>
        <div className="flex items-center gap-2.5">
          {/* <span className={`${badgeCls} ${aptitud.NivelRiesgo === "Verde" ? ESTILO_APTITUD.apto : aptitud.NivelRiesgo === "Rojo" ? ESTILO_APTITUD.noApto : "bg-linear-to-r from-amber-200 to-amber-100/50 text-amber-700"}`}>
            {aptitud.Dictamen}
          </span> */}
          <TogglecriteriosAplicados criterios={aptitud.CriteriosAplicados} acento={ESTILOS_NIVEL_APTITUD[aptitud.NivelRiesgo].acento} />
        </div>
      </div>
      <p className="relative text-[13px] text-justify leading-relaxed mb-3 pl-5">
        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${ESTILOS_NIVEL_APTITUD[aptitud.NivelRiesgo].acento}`}></span>
        <span className="font-bold">Puesto: </span>{resaltarPuestoYMatricula(aptitud.Justificacion, matricula)}
        <br></br>
      </p>
      <div className={`rounded-lg px-3 py-2 flex items-center gap-2.5 ${ESTILOS_NIVEL_APTITUD[aptitud.NivelRiesgo].acento}`}>
        <i className="fa-solid fa-comment-medical text-white text-sm shrink-0"></i>
        <p className="text-[12px] text-white leading-relaxed"><span className="font-bold">Recomendación: </span>{resaltarPuestoYMatricula(aptitud.Recomendacion, matricula)}</p>
      </div>
      <ShimmerOverlay subtle />
    </div>

    {riesgoReciente && (
      <div className={`relative overflow-hidden rounded-xl shadow-xs p-6 bg-linear-to-r ${ESTILOS_RIESGO_NIVEL[riesgoReciente.nivel]} to-white`}>
        <img
          src={logoSano}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-6 top-1/2 -translate-y-1/2 h-24 w-auto opacity-20"
        />
        <h2 className="relative text-sm font-bold flex items-center mb-2.5">
          <i className={`fa-solid ${riesgoReciente.nivel === 1 ? "fa-circle-check" : riesgoReciente.nivel === 2 ? "fa-circle-exclamation" : "fa-triangle-exclamation"} mr-3`}></i>
          Nivel de Riesgo: {NOMBRE_RIESGO_NIVEL[riesgoReciente.nivel]}
        </h2>
        <p className="relative text-[13px] leading-relaxed">
          La toma de indicadores más reciente ({riesgoReciente.fecha.toLocaleDateString("es-MX")}) indicó como resultado un <b>riesgo {NOMBRE_RIESGO_NIVEL[riesgoReciente.nivel].toLowerCase()}</b>. Considerarlo como un personal dentro de este umbral antes de tomar cualquier decisión.
        </p>
      </div>
    )}

    {/* Oculta temporalmente a pedido — no se eliminó, solo se comentó.
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
    */}
  </div>
  </div>
);

export default HeaderAnalisis;
