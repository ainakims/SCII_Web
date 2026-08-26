import { RegistroValidado } from "../saludPoblacional/types";
import {
  EvolucionIMC,
  EvolucionPesoAnual,
  HeatmapAsistenciaAnio,
  HeatmapAsistenciaMes,
  MatrizProtocoloItem,
  NivelRiesgo,
  PerfilMetabolico,
  PresionArterial,
} from "../analisisIndividual/types";
import { ConsultaPropia } from "./types";

// Reconstruye, a partir de datos crudos por matrícula (SCII_Indicadores +
// SCII_Consultas, vía DashboardUsuario/ObtenerResumenPropio), el mismo shape
// de "HistoricosYGraficas" que normalmente arma el servicio de IA externo —
// así se reutilizan sin cambios KpiCard/UltimaTomaSection/MatricesSection.
// No incluye Enfermedades ni nada del análisis de IA (fuera de alcance).
export interface GraficasPropias {
  meses: string[];
  presionArterial: PresionArterial;
  evolucionIMC: EvolucionIMC;
  evolucionPesoAnual: EvolucionPesoAnual;
  perfilMetabolico: PerfilMetabolico;
  heatmapAsistencia: HeatmapAsistenciaAnio[];
  matrizProtocolos: MatrizProtocoloItem[];
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Umbrales clínicos de referencia estándar (ayuno) — el servicio de IA normalmente
// los calcula/ajusta, pero aquí no se dispone de esa lógica, así que se usan
// valores de referencia fijos para las líneas guía de PerfilMetabolicoChart.
const UMBRAL_GLUCOSA = 100;
const UMBRAL_COLESTEROL = 200;
const UMBRAL_TRIGLICERIDOS = 150;

function fechaValida(f: { valida: boolean; original: string | null }): Date | null {
  if (!f.valida || !f.original) return null;
  const fecha = new Date(f.original);
  return isNaN(fecha.getTime()) ? null : fecha;
}

function formatoDDMonYYYY(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${dia}/${MESES_CORTOS[fecha.getMonth()]}/${fecha.getFullYear()}`;
}

function formatoMesAnio(fecha: Date): string {
  return `${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function construirGraficasPropias(registros: RegistroValidado[], consultas: ConsultaPropia[]): GraficasPropias {
  const registrosConFecha = registros
    .map((r) => ({ registro: r, fecha: fechaValida(r.Fecha) }))
    .filter((r): r is { registro: RegistroValidado; fecha: Date } => r.fecha != null)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const consultasConFecha = consultas
    .map((c) => ({ consulta: c, fecha: fechaValida(c.FechaConsulta) }))
    .filter((c): c is { consulta: ConsultaPropia; fecha: Date } => c.fecha != null)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  // Presión arterial / frecuencia cardiaca: eventos combinados de tomas del
  // programa (SCII_Indicadores, sin FC) y de consulta (SCII_Consultas, trae
  // PA y FC), ordenados por fecha — mismo criterio de "Origen" que el
  // servicio de IA usa para distinguir el punto en la gráfica.
  const eventosPresion = [
    ...registrosConFecha.map(({ registro, fecha }) => ({
      fecha,
      sistolica: registro.Sistolica.numerico,
      diastolica: registro.Diastolica.numerico,
      frecuenciaCardiaca: null as number | null,
      origen: "Programa" as const,
    })),
    ...consultasConFecha
      .filter(({ consulta }) => consulta.Sistolica != null || consulta.Diastolica != null || consulta.FrecuenciaCardiaca != null)
      .map(({ consulta, fecha }) => ({
        fecha,
        sistolica: consulta.Sistolica,
        diastolica: consulta.Diastolica,
        frecuenciaCardiaca: consulta.FrecuenciaCardiaca,
        origen: "Consulta" as const,
      })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const presionArterial: PresionArterial = {
    Fechas: eventosPresion.map((e) => formatoDDMonYYYY(e.fecha)),
    Sistolica: eventosPresion.map((e) => e.sistolica),
    Diastolica: eventosPresion.map((e) => e.diastolica),
    FrecuenciaCardiaca: eventosPresion.map((e) => e.frecuenciaCardiaca),
    Origen: eventosPresion.map((e) => e.origen),
  };

  // Meses (eje compartido de IMC y Perfil Metabólico): un mes por cada toma
  // de indicadores, sin duplicar si hay más de una en el mismo mes.
  const mesesMap = new Map<string, Date>();
  registrosConFecha.forEach(({ fecha }) => {
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
    if (!mesesMap.has(clave)) mesesMap.set(clave, new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  });
  const mesesOrdenados = Array.from(mesesMap.values()).sort((a, b) => a.getTime() - b.getTime());
  const meses = mesesOrdenados.map(formatoMesAnio);

  // Último valor no nulo de un campo dentro de cada mes (puede haber más de
  // una toma en el mismo mes; se conserva la más reciente).
  function ultimoPorMes(campo: (r: RegistroValidado) => number | null): (number | null)[] {
    return mesesOrdenados.map((mes) => {
      let valor: number | null = null;
      registrosConFecha.forEach(({ registro, fecha }) => {
        if (fecha.getFullYear() !== mes.getFullYear() || fecha.getMonth() !== mes.getMonth()) return;
        const v = campo(registro);
        if (v != null) valor = v;
      });
      return valor;
    });
  }

  const evolucionIMC: EvolucionIMC = {
    ValoresIMC: ultimoPorMes((r) => r.IMC.usado),
    NivelRiesgo: mesesOrdenados.map((mes) => {
      let riesgo: NivelRiesgo = null;
      registrosConFecha.forEach(({ registro, fecha }) => {
        if (fecha.getFullYear() !== mes.getFullYear() || fecha.getMonth() !== mes.getMonth()) return;
        if (registro.Riesgo === 1 || registro.Riesgo === 2 || registro.Riesgo === 3) riesgo = registro.Riesgo;
      });
      return riesgo;
    }),
  };

  const perfilMetabolico: PerfilMetabolico = {
    Glucosa: ultimoPorMes((r) => r.Glucosa.numerico),
    Colesterol: ultimoPorMes((r) => r.Colesterol.numerico),
    Trigliceridos: ultimoPorMes((r) => r.Trigliceridos.numerico),
    UmbralGlucosa: UMBRAL_GLUCOSA,
    UmbralColesterol: UMBRAL_COLESTEROL,
    UmbralTrigliceridos: UMBRAL_TRIGLICERIDOS,
  };

  // Peso: serie con sus propias fechas (no acotada a "meses"). Peso ideal
  // ("meta") calculado con la altura más reciente conocida y un IMC de
  // referencia de 22 (punto medio del rango normal), ya que no se dispone de
  // la fórmula clínica que usa el servicio de IA.
  const alturaConocida = [...registrosConFecha].reverse().find((r) => r.registro.Altura.numerico != null)?.registro.Altura
    .numerico ?? null;
  const pesoIdeal = alturaConocida != null ? Math.round(alturaConocida * alturaConocida * 22 * 10) / 10 : null;

  const evolucionPesoAnual: EvolucionPesoAnual = {
    Fechas: registrosConFecha.map(({ fecha }) => formatoDDMonYYYY(fecha)),
    PesoReal: registrosConFecha.map(({ registro }) => registro.Peso.numerico),
    PesoIdeal: registrosConFecha.map(() => pesoIdeal),
  };

  // Heatmap de asistencia: por año, "ok" si hubo al menos una toma de
  // indicadores ese mes (con su Riesgo más reciente), "miss" si no hubo y ya
  // pasó, "future" si el mes todavía no llega.
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();

  const aniosSet = new Set<number>([anioActual]);
  registrosConFecha.forEach(({ fecha }) => aniosSet.add(fecha.getFullYear()));
  const anios = Array.from(aniosSet).sort((a, b) => a - b);

  const heatmapAsistencia: HeatmapAsistenciaAnio[] = anios.map((anio) => {
    const mesesAnio: HeatmapAsistenciaMes[] = MESES_CORTOS.map((nombreMes, indiceMes) => {
      const esFuturo = anio > anioActual || (anio === anioActual && indiceMes > mesActual);
      if (esFuturo) return { Mes: nombreMes, Estatus: "future", Riesgo: null };

      let riesgo: NivelRiesgo = null;
      let hayDatos = false;
      registrosConFecha.forEach(({ registro, fecha }) => {
        if (fecha.getFullYear() !== anio || fecha.getMonth() !== indiceMes) return;
        hayDatos = true;
        if (registro.Riesgo === 1 || registro.Riesgo === 2 || registro.Riesgo === 3) riesgo = registro.Riesgo;
      });

      return hayDatos ? { Mes: nombreMes, Estatus: "ok", Riesgo: riesgo } : { Mes: nombreMes, Estatus: "miss", Riesgo: null };
    });
    return { Anio: anio, Meses: mesesAnio };
  });

  // Matriz de protocolos: consultas agrupadas por protocolo (mismo criterio
  // que construirConsultasPorDepartamento en saludPoblacional/analytics.ts:
  // TipoProtocolo, con fallback a TipoAtencion) y por año/mes.
  const conteoPorProtocolo = new Map<string, Map<number, number[]>>();
  consultasConFecha.forEach(({ consulta, fecha }) => {
    const nombre = consulta.TipoProtocolo?.trim() || consulta.TipoAtencion?.trim() || "Sin clasificar";
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();

    let porAnio = conteoPorProtocolo.get(nombre);
    if (!porAnio) {
      porAnio = new Map();
      conteoPorProtocolo.set(nombre, porAnio);
    }
    let conteoMeses = porAnio.get(anio);
    if (!conteoMeses) {
      conteoMeses = new Array(12).fill(0);
      porAnio.set(anio, conteoMeses);
    }
    conteoMeses[mes] += 1;
  });

  const matrizProtocolos: MatrizProtocoloItem[] = Array.from(conteoPorProtocolo.entries()).map(([nombre, porAnio], indice) => ({
    IdProtocolo: indice + 1,
    Nombre: nombre,
    ConteoPorAnio: Array.from(porAnio.entries())
      .map(([anio, conteoMeses]) => ({ Anio: anio, ConteoMeses: conteoMeses }))
      .sort((a, b) => a.Anio - b.Anio),
  }));

  return { meses, presionArterial, evolucionIMC, evolucionPesoAnual, perfilMetabolico, heatmapAsistencia, matrizProtocolos };
}
