import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import KpiCard from "../features/saludPoblacional/components/shared/KpiCard";
import { RegistroValidado } from "../features/saludPoblacional/types";
import { AnalisisIndividualResult } from "../features/analisisIndividual/types";
import HeaderAnalisis from "../features/analisisIndividual/components/HeaderAnalisis";
import AnalisisIndividualSkeleton from "../features/analisisIndividual/components/AnalisisIndividualSkeleton";
import OverlayTransicionAnalisis from "../features/saludPoblacional/components/shared/OverlayTransicionAnalisis";
import UltimaTomaSection from "../features/analisisIndividual/components/UltimaTomaSection";
import MatricesSection from "../features/analisisIndividual/components/MatricesSection";
import HallazgosSection from "../features/analisisIndividual/components/HallazgosSection";
import DiagnosticoSection from "../features/analisisIndividual/components/DiagnosticoSection";
import IncertidumbreSection from "../features/analisisIndividual/components/IncertidumbreSection";
import EnfermedadesBadges from "../features/analisisIndividual/components/EnfermedadesBadges";

// Último valor no nulo de una serie histórica (y su etiqueta correspondiente),
// recorriendo de más reciente a más antiguo.
function ultimoValido<T>(valores: T[], etiquetas: string[]): { valor: T; etiqueta: string } | null {
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i] != null) return { valor: valores[i], etiqueta: etiquetas[i] ?? "" };
  }
  return null;
}

const MESES_ABREV: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

// Fechas de HistoricosYGraficas vienen como "01/Mar/2025" (ver
// EvolucionPesoChart.tsx), no parseables directamente con `new Date()`.
function parsearFechaDDMonYYYY(fecha: string): Date | null {
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;
  const dia = Number(partes[0]);
  const mes = MESES_ABREV[partes[1].toLowerCase()];
  const anio = Number(partes[2]);
  if (!Number.isFinite(dia) || mes == null || !Number.isFinite(anio)) return null;
  const fechaObj = new Date(anio, mes, dia);
  return isNaN(fechaObj.getTime()) ? null : fechaObj;
}

// Análisis Individual: consume el servicio SOAP externo EvaluarSaludConAnalisisIA
// (EvaluacionSalud.asmx, repo aparte — ver memoria de proyecto) a través del
// backend de SCII_Web. El backend decide `esUsuarioMedico` a partir del rol del
// JWT, nunca del cliente, porque controla si el servicio regresa contenido
// clínico sensible (diagnóstico diferencial, aptitud laboral detallada).
//
// Vista de página completa (mismo patrón que DashboardDepartamento.tsx), no
// drawer/modal: se accede desde Pacientes/Reingresos al hacer clic sobre un
// paciente. Ruta /Pacientes/:matricula o /Reingresos/:matricula (ver
// Topbar.tsx para el breadcrumb "Pacientes/Reingresos > Matrícula - Nombre");
// el nombre viaja por location.state (solo disponible al navegar desde la
// tabla, no en un refresh directo de la URL) y es puramente decorativo,
// nunca se usa para las llamadas al backend.
const AnalisisIndividual: React.FC = () => {
  const { matricula: matriculaParam } = useParams<{ matricula: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const matricula = matriculaParam ? decodeURIComponent(matriculaParam) : undefined;

  // Personal activo -> Evaluar; Reingresos -> EvaluarInactivos (viaja por
  // location.state igual que "nombre", puesto por PacientesTabla.tsx al
  // navegar). Si no viene (refresh directo de la URL, sin pasar por la
  // tabla), se asume activo por default.
  const esActivo = (location.state as any)?.activo !== false;

  // PacientesTabla.tsx ya genera el análisis ANTES de navegar aquí (muestra
  // su propio overlay de transición sobre Pacientes/Reingresos mientras
  // espera la respuesta) y lo manda por location.state — así se evita
  // mostrar el overlay de "Generando análisis con IA" por segunda vez en
  // esta página. Si no viene (falló la pre-carga, o se llegó por un refresh
  // directo de la URL sin pasar por la tabla), se genera aquí como siempre.
  const resultadoPrecargado = (location.state as any)?.resultadoPrecargado as AnalisisIndividualResult | null | undefined;

  const [resultado, setResultado] = useState<AnalisisIndividualResult | null>(resultadoPrecargado ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aviso de IA: se muestra con SweetAlert2 por encima del contenido cada vez
  // que termina de generarse un análisis (incluye regeneraciones). SweetAlert
  // no desmonta el árbol de React detrás, así que las cards se siguen
  // generando/viendo normalmente, el aviso solo se interpone hasta que el
  // usuario lo cierra.
  const [avisoVisible, setAvisoVisible] = useState(!!resultadoPrecargado);

  const AVISO_IA_HTML = `Todos los hallazgos, diagnósticos y recomendaciones son evaluados e interpretados por inteligencia artificial. <b>No debe tomarse como una verdad absoluta</b>.`;

  // Historial de indicadores del empleado seleccionado (SCII_Valores_Indicadores_Por_Empleado),
  // mismo shape que /SaludPoblacional/ObtenerDatos pero acotado a esta matrícula.
  // Todavía sin usarse en las gráficas: se trae aquí, las adecuaciones de UI van después.
  const [registroEmpleado, setRegistroEmpleado] = useState<RegistroValidado[]>([]);

  // Riesgo (1/2/3) de la toma de indicadores más reciente en SCII_Indicadores
  // para esta matrícula, independiente del análisis de IA — alimenta la card
  // "Nivel de Riesgo" en HeaderAnalisis.tsx. Se ignoran lecturas sin Riesgo
  // 1/2/3 o con fecha inválida; de las que sí califican se toma la más nueva.
  const riesgoReciente = useMemo(() => {
    const candidatos: { nivel: 1 | 2 | 3; fecha: Date }[] = [];

    for (const r of registroEmpleado) {
      if (r.Riesgo !== 1 && r.Riesgo !== 2 && r.Riesgo !== 3) continue;
      if (!r.Fecha.valida || !r.Fecha.original) continue;

      const fecha = new Date(r.Fecha.original);
      if (isNaN(fecha.getTime())) continue;

      candidatos.push({ nivel: r.Riesgo, fecha });
    }

    if (candidatos.length === 0) return null;

    return candidatos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0];
  }, [registroEmpleado]);

  // Fecha más antigua entre todos los registros disponibles de este paciente
  // (consultas/indicadores en registroEmpleado, y las series históricas que
  // trae el propio Evaluar/EvaluarInactivos) — alimenta la leyenda de
  // "periodo analizado" en HeaderAnalisis.tsx.
  const fechaInicioAnalisis = useMemo(() => {
    const fechas: Date[] = [];

    for (const r of registroEmpleado) {
      if (!r.Fecha.valida || !r.Fecha.original) continue;
      const fecha = new Date(r.Fecha.original);
      if (!isNaN(fecha.getTime())) fechas.push(fecha);
    }

    if (resultado) {
      const { PresionArterial, EvolucionPesoAnual } = resultado.HistoricosYGraficas;
      for (const fechaStr of [...PresionArterial.Fechas, ...EvolucionPesoAnual.Fechas]) {
        const fecha = parsearFechaDDMonYYYY(fechaStr);
        if (fecha) fechas.push(fecha);
      }
    }

    if (fechas.length === 0) return null;
    return fechas.reduce((min, f) => (f < min ? f : min));
  }, [registroEmpleado, resultado]);

  const regresar = useCallback(() => navigate(-1), [navigate]);

  // Evita que el análisis se dispare más de una vez para la misma matrícula
  // (React.StrictMode en desarrollo monta/desmonta/vuelve a montar los efectos
  // a propósito, y sin esto se disparaban dos llamadas reales al servicio de
  // IA en paralelo — la que respondía más tarde pisaba silenciosamente el
  // resultado de la primera). Cada llamada a generar() aborta cualquier
  // petición anterior todavía en curso antes de lanzar la nueva.
  const abortRef = useRef<AbortController | null>(null);

  const generar = useCallback(async () => {
    if (!matricula) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const endpoint = esActivo ? "Evaluar" : "EvaluarInactivos";
      const res = await fetchWithAuth(`${API_BASE_URL}/AnalisisIndividual/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ matricula: matricula.trim() }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (json?.ok) {
        setResultado(json.data);
        setAvisoVisible(true);
      } else {
        setError(json?.message || "No se pudo generar el análisis.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Error al generar análisis individual:", err);
      setError("Error de conexión al generar el análisis.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [matricula, esActivo]);

  useEffect(() => {
    if (matricula && !resultadoPrecargado) generar();
    return () => { abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matricula, generar]);

  // Evita que la consulta se dispare más de una vez para la misma matrícula
  // (React.StrictMode en desarrollo monta/desmonta/vuelve a montar los
  // efectos a propósito). A diferencia de generar(), aquí no hace falta
  // cancelar la petición en curso al reintentar: basta con no volver a
  // pedirla si ya se solicitó para esta matrícula. Si el ref sigue
  // apuntando a la matrícula previa se vuelve a disparar la consulta.
  const registroSolicitadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!matricula) return;
    if (registroSolicitadoRef.current === matricula) return;
    registroSolicitadoRef.current = matricula;

    fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ObtenerDatosPorEmpleado`, {
      method: "POST",
      body: JSON.stringify({ matricula: matricula.trim() }),
    })
      .then((res) => res.json())
      .then((json) => setRegistroEmpleado(json?.ok && Array.isArray(json.data) ? json.data : []))
      .catch((err) => console.error("Error al obtener indicadores del empleado:", err));
  }, [matricula]);

  useEffect(() => {
  if (!avisoVisible) return;

  Swal.fire({
    title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Antes de continuar</p>`,
    html: `<p style="font-size: 16px">${AVISO_IA_HTML}</p>`,

    iconHtml: `
      <i class="fa-solid fa-exclamation aviso-exclamation"></i>

      <style>
        .aviso-exclamation {
          font-size: 70px;
          animation: shakeInitial 0.6s ease-in-out,
                     shakePeriodic 4s ease-in-out 1.5s infinite;
        }

        /* Sacudida fuerte al aparecer */
        @keyframes shakeInitial {
          0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
          40%  { transform: scale(1.05) rotate(10deg); }
          60%  { transform: scale(1.05) rotate(-7deg); }
          80%  { transform: scale(1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        /* Sacudidas periódicas */
        @keyframes shakePeriodic {
          0%, 85%, 100% {
            transform: rotate(0deg);
          }
          87% {
            transform: rotate(-10deg);
          }
          89% {
            transform: rotate(10deg);
          }
          91% {
            transform: rotate(-8deg);
          }
          93% {
            transform: rotate(8deg);
          }
          95% {
            transform: rotate(-4deg);
          }
          97% {
            transform: rotate(4deg);
          }
        }
      </style>
    `,

    didOpen: (p) => {
      const el = p.querySelector(".swal2-icon") as HTMLElement;

      if (el) {
        Object.assign(el.style, {
          border: "none",
          background: "transparent",
          boxShadow: "none",
          width: "auto",
          height: "auto",
        });
      }
    },

    buttonsStyling: false,

    confirmButtonText: `
      <i class="fa-solid fa-thumbs-up mr-1"></i> Entendido
    `,
allowOutsideClick: false,
    customClass: {
      confirmButton:
        "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
    },
  }).then(() => setAvisoVisible(false));
}, [avisoVisible]);

  // Solo UI por ahora: no hay endpoint de backend todavía para persistir el
  // seguimiento programado ni la autorización de reingreso. Se deja como
  // confirmación visual hasta que exista esa integración.
  const abrirModalAccion = () => {
    if (esActivo) {
      Swal.fire({
        title: "Programar seguimiento",
        html: `
          ${AVISO_IA_HTML}
          <div style="display:flex;gap:8px;margin:14px 0 8px">
            <input id="swal-fecha-seguimiento" type="date" min="${new Date().toISOString().split("T")[0]}" style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:12px" />
            <input id="swal-hora-seguimiento" type="time" style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:12px" />
          </div>
          <textarea id="swal-notas-seguimiento" placeholder="Notas (opcional)" rows="2" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:12px;resize:none"></textarea>
        `,
        confirmButtonText: "Programar seguimiento",
        confirmButtonColor: "#002E6D",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          const fecha = (document.getElementById("swal-fecha-seguimiento") as HTMLInputElement)?.value;
          const hora = (document.getElementById("swal-hora-seguimiento") as HTMLInputElement)?.value;
          if (!fecha || !hora) {
            Swal.showValidationMessage("Selecciona una fecha y hora para el seguimiento.");
            return false;
          }
          return { fecha, hora };
        },
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          Swal.fire({
            icon: "success",
            title: "Seguimiento programado",
            text: `Se registró el seguimiento para el ${result.value.fecha} a las ${result.value.hora}.`,
            confirmButtonColor: "#002E6D",
          });
        }
      });
    } else {
      Swal.fire({
        title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Autorizar reingreso</p>`,
        html: `
          <p style="font-size: 16px">Si confirma esta acción se <b>notificará como reingreso apto</b> al área de RRHH.</p>
          <div class="flex items-start gap-2 bg-gray-100 text-gray-600 rounded-lg mt-4 px-3 py-2" style="text-align:left">
            <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
            <p class="leading-relaxed" style="font-size: 12px">Recuerda evaluar el resultado del análisis antes de continuar.</p>
          </div>
        `,
        iconHtml: `
          <i class="fa-solid fa-question aviso-question"></i>
          <style>
            .aviso-question {
              color: #545454;
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
          if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" });
        },
        buttonsStyling: false,
        showDenyButton: true,
        confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> Aprobar`,
        denyButtonText: `<i class="fa-solid fa-xmark mr-1"></i> Denegar`,
        customClass: {
          confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
          denyButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Reingreso autorizado</p>`,
            html: `<p style="font-size: 16px; padding: 0 40px">Se registró la autorización para la recontratación de este candidato.</p>`,
            iconHtml: `<i class="fa-solid fa-check success-icon"></i><style> .success-icon { color: #545454; font-size: 90px; animation: pop 0.4s ease-out forwards, popPeriodic 4s ease-in-out 1.5s infinite; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } @keyframes popPeriodic { 0%, 85%, 100% { transform: scale(1); } 90% { transform: scale(1.15); } 95% { transform: scale(0.95); } } </style>`,
            didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
            buttonsStyling: false,
            confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
            customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
          });
        } else if (result.isDenied) {
          Swal.fire({
            title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Reingreso no autorizado</p>`,
            html: `<p style="font-size: 16px; padding: 0 40px">Se registró que no se autoriza la recontratación de este candidato.</p>`,
            iconHtml: `<i class="fa-solid fa-circle-info success-icon"></i><style> .success-icon { color: #545454; font-size: 90px; animation: pop 0.4s ease-out forwards, popPeriodic 4s ease-in-out 1.5s infinite; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } @keyframes popPeriodic { 0%, 85%, 100% { transform: scale(1); } 90% { transform: scale(1.15); } 95% { transform: scale(0.95); } } </style>`,
            didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
            buttonsStyling: false,
            confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
            customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
          });
        }
      });
    }
  };

  if (!matricula) {
    return (
      <div className="relative flex w-full overflow-hidden">
        <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto px-4 pb-6">
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3 bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl">
              <i className="mdi mdi-account-search-outline text-3xl"></i>
              <p className="text-sm">No se especificó ningún paciente.</p>
              <button
                onClick={regresar}
                className="flex items-center gap-2 bg-linear-to-r from-sea-blue to-sky-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                <i className="mdi mdi-arrow-left"></i>
                Regresar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-6">
          {loading && !resultado && <AnalisisIndividualSkeleton />}
          {loading && <OverlayTransicionAnalisis />}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl shadow-md">
              <i className="mdi mdi-alert-circle-outline mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {resultado && (
            <>
              {(() => {
                const { PresionArterial, EvolucionIMC, EvolucionPesoAnual, Meses } = resultado.HistoricosYGraficas;
                const sistolica = ultimoValido(PresionArterial.Sistolica, PresionArterial.Fechas);
                const diastolica = ultimoValido(PresionArterial.Diastolica, PresionArterial.Fechas);
                const fc = ultimoValido(PresionArterial.FrecuenciaCardiaca, PresionArterial.Fechas);
                const imc = ultimoValido(EvolucionIMC.ValoresIMC, Meses);
                const peso = ultimoValido(EvolucionPesoAnual.PesoReal, EvolucionPesoAnual.Fechas);
                const pesoIdeal = ultimoValido(EvolucionPesoAnual.PesoIdeal, EvolucionPesoAnual.Fechas);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard
                      icon="gauge-high"
                      label="Presión arterial"
                      value={sistolica && diastolica ? `${sistolica.valor}/${diastolica.valor} mmHg` : "N/A"}
                    />
                    <KpiCard
                      icon="scale-balanced"
                      label="IMC"
                      value={imc ? `${imc.valor} kg/m²` : "N/A"}
                    />
                    <KpiCard
                      icon="heart-pulse"
                      label="Frecuencia cardiaca"
                      value={fc ? `${fc.valor} bpm` : "N/A"}
                    />
                    <KpiCard
                      icon="weight-scale"
                      label="Peso actual"
                      value={peso ? `${peso.valor} kg` : "N/A"}
                    />
                  </div>
                );
              })()}
              <HeaderAnalisis prioridad={resultado.PrioridadYUrgencia} aptitud={resultado.AptitudLaboral} matricula={matricula} riesgoReciente={riesgoReciente} fechaInicioAnalisis={fechaInicioAnalisis} />
              {/* Oculto (no eliminado): "Enfermedades registradas" no se va a ocupar por ahora. */}
              {/* <EnfermedadesBadges enfermedades={resultado.HistoricosYGraficas.Enfermedades} /> */}
              <UltimaTomaSection
                meses={resultado.HistoricosYGraficas.Meses}
                peso={resultado.HistoricosYGraficas.EvolucionPesoAnual}
                presion={resultado.HistoricosYGraficas.PresionArterial}
                imc={resultado.HistoricosYGraficas.EvolucionIMC}
                perfilMetabolico={resultado.HistoricosYGraficas.PerfilMetabolico}
              />
              <MatricesSection
                heatmap={resultado.HistoricosYGraficas.HeatmapAsistencia}
                protocolos={resultado.HistoricosYGraficas.MatrizProtocolos}
              />
              <HallazgosSection hallazgos={resultado.HallazgosRelevantes} />
              <DiagnosticoSection diagnostico={resultado.DiagnosticoDiferencial} />
              {/* Oculto (no eliminado): "Factores de incertidumbre registrados" no se va a ocupar por ahora. */}
              {/* <IncertidumbreSection evolucion={resultado.EvolucionYRiesgosPotenciales} /> */}
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={generar}
              disabled={loading}
              title={resultado ? "Regenerar análisis" : "Generar análisis"}
              className="w-35 flex items-center justify-center border border-gray-100 shadow-md bg-white text-gray-600 hover:text-sea-blue px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className="fa-solid fa-rotate text-xs mr-2"></i>
              Regenerar
            </button>
            <button
              onClick={abrirModalAccion}
              disabled={!resultado}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className={`fa-solid ${esActivo ? "fa-calendar-week" : "fa-user-check"} text-xs mr-2`}></i>
              {esActivo ? "Seguimiento" : "Autorizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisIndividual;
