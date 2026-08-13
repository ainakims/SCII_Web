// Funciones puras de agregación para el Dashboard de Salud Poblacional.
// Reciben siempre el arreglo ya filtrado (mismo patrón que Indicadores.tsx: el
// backend regresa filas normalizadas, el frontend construye todas las agregaciones).
//
// Principio (sección 32 del documento): cada indicador usa su propio conjunto de
// valores válidos como denominador; nunca se comparte un único denominador global.

import { RegistroValidado, ValorNormalizado, EstadisticasIndicador, Filtros, RegistroConsultaValidado } from "./types";
import { clasificarRiesgo, clasificarTipoEmpleado } from "./clinicalRules";

export type IndicadorClave =
  | "IMC" | "Sistolica" | "Diastolica" | "Glucosa" | "Colesterol" | "Trigliceridos" | "Peso" | "Altura" | "PA" | "ICT" | "Riesgo";

// Estados cuyo valor numérico es utilizable en estadísticas (sección 9: los valores
// extremos NO se descartan; los inconsistentes tampoco se sobrescriben, se conservan).
const ESTADOS_UTILES = new Set(["VALIDO", "FUERA_DE_RANGO"]);
const ESTADOS_COBERTURA_EXCLUIDOS = new Set(["FALTANTE"]);

// Nunca debe filtrarse "!= null" contra el resultado de esta función sin más: un
// valor no numérico que se haya colado desde el origen (p. ej. un texto en una
// columna que debería ser numérica) puede quedar marcado como VALIDO pero no ser
// un número real. Por eso aquí se filtra explícitamente con Number.isFinite antes
// de devolverlo — un solo NaN sin filtrar contamina cualquier suma/promedio
// posterior (regresión, medias, etc.) porque NaN se propaga en toda la cadena.
export function obtenerValor(registro: RegistroValidado, campo: IndicadorClave): number | null {
  if (campo === "IMC") {
    if (registro.IMC.estado === "FALTANTE") return null;
    return Number.isFinite(registro.IMC.usado) ? (registro.IMC.usado as number) : null;
  }
  if (campo === "Riesgo") return Number.isFinite(registro.Riesgo) ? (registro.Riesgo as number) : null;
  const v: ValorNormalizado = (registro as any)[campo];
  if (!ESTADOS_UTILES.has(v.estado)) return null;
  return Number.isFinite(v.numerico) ? (v.numerico as number) : null;
}

export function obtenerEstado(registro: RegistroValidado, campo: IndicadorClave): string {
  if (campo === "IMC") return registro.IMC.estado;
  if (campo === "Riesgo") return registro.Riesgo == null ? "FALTANTE" : "VALIDO";
  return ((registro as any)[campo] as ValorNormalizado).estado;
}

// --- Edad ------------------------------------------------------------------

// Edad exacta a una fecha de referencia (sección 13). Si falta la fecha de
// nacimiento, la edad no se calcula (no se asume), y se reporta null.
export function calcularEdad(fechaNacimientoISO: string | null, fechaReferenciaISO: string | null): number | null {
  if (!fechaNacimientoISO || !fechaReferenciaISO) return null;
  const nacimiento = new Date(fechaNacimientoISO);
  const referencia = new Date(fechaReferenciaISO);
  if (Number.isNaN(nacimiento.getTime()) || Number.isNaN(referencia.getTime())) return null;

  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(referencia.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (cumpleEsteAnio > referencia) edad--;
  return edad >= 0 ? edad : null;
}

// --- Estadísticas robustas (sección 32) ------------------------------------

function percentil(valoresOrdenados: number[], p: number): number {
  if (valoresOrdenados.length === 1) return valoresOrdenados[0];
  const indice = (p / 100) * (valoresOrdenados.length - 1);
  const inferior = Math.floor(indice);
  const superior = Math.ceil(indice);
  if (inferior === superior) return valoresOrdenados[inferior];
  const fraccion = indice - inferior;
  return valoresOrdenados[inferior] + (valoresOrdenados[superior] - valoresOrdenados[inferior]) * fraccion;
}

export function calcularEstadisticas(valores: number[]): EstadisticasIndicador {
  const limpios = valores.filter((v) => Number.isFinite(v));
  const n = limpios.length;
  if (n === 0) {
    return { n: 0, media: null, mediana: null, min: null, max: null, p25: null, p75: null, desviacion: null };
  }

  const ordenados = [...limpios].sort((a, b) => a - b);
  const media = limpios.reduce((acc, v) => acc + v, 0) / n;
  const desviacion = n > 1
    ? Math.sqrt(limpios.reduce((acc, v) => acc + (v - media) ** 2, 0) / (n - 1))
    : null;

  return {
    n,
    media: Number(media.toFixed(2)),
    mediana: Number(percentil(ordenados, 50).toFixed(2)),
    min: ordenados[0],
    max: ordenados[n - 1],
    p25: Number(percentil(ordenados, 25).toFixed(2)),
    p75: Number(percentil(ordenados, 75).toFixed(2)),
    desviacion: desviacion != null ? Number(desviacion.toFixed(2)) : null,
  };
}

export function estadisticasIndicador(registros: RegistroValidado[], campo: IndicadorClave): EstadisticasIndicador {
  const valores = registros
    .map((r) => obtenerValor(r, campo))
    .filter((v): v is number => v != null);
  return calcularEstadisticas(valores);
}

// --- Estado actual (sección 4.1) --------------------------------------------

// Un registro por Matricula: el de mayor Fecha válida; empate -> mayor Id.
export function construirEstadoActual(registros: RegistroValidado[]): RegistroValidado[] {
  const porMatricula = new Map<string, RegistroValidado>();

  registros.forEach((r) => {
    if (!r.Fecha.valida) return;
    const actual = porMatricula.get(r.Matricula);
    if (!actual) { porMatricula.set(r.Matricula, r); return; }

    const fechaActual = new Date(actual.Fecha.original as string).getTime();
    const fechaNueva = new Date(r.Fecha.original as string).getTime();

    if (fechaNueva > fechaActual || (fechaNueva === fechaActual && r.Id > actual.Id)) {
      porMatricula.set(r.Matricula, r);
    }
  });

  return Array.from(porMatricula.values());
}

// --- Última medición válida por indicador (sección 5.2) ---------------------

export interface UltimaMedicionValida {
  valor: number;
  fecha: string;
}

export function construirUltimaMedicionValida(
  registros: RegistroValidado[],
  campo: IndicadorClave
): Map<string, UltimaMedicionValida> {
  const resultado = new Map<string, UltimaMedicionValida>();

  registros.forEach((r) => {
    if (!r.Fecha.valida) return;
    if (obtenerEstado(r, campo) !== "VALIDO") return;
    const valor = obtenerValor(r, campo);
    if (valor == null) return;

    const actual = resultado.get(r.Matricula);
    const fechaNueva = new Date(r.Fecha.original as string).getTime();
    if (!actual || fechaNueva > new Date(actual.fecha).getTime()) {
      resultado.set(r.Matricula, { valor, fecha: r.Fecha.original as string });
    }
  });

  return resultado;
}

// --- Cobertura y calidad (sección 18) ---------------------------------------

export interface CoberturaCalidad {
  totalEvaluado: number;
  presentes: number;
  validos: number;
  coberturaPct: number;
  calidadPct: number;
}

export function calcularCoberturaCalidad(registros: RegistroValidado[], campo: IndicadorClave): CoberturaCalidad {
  const totalEvaluado = registros.length;
  let presentes = 0;
  let validos = 0;

  registros.forEach((r) => {
    const estado = obtenerEstado(r, campo);
    if (!ESTADOS_COBERTURA_EXCLUIDOS.has(estado)) presentes++;
    if (ESTADOS_UTILES.has(estado)) validos++;
  });

  return {
    totalEvaluado,
    presentes,
    validos,
    coberturaPct: totalEvaluado ? Number(((presentes / totalEvaluado) * 100).toFixed(1)) : 0,
    calidadPct: totalEvaluado ? Number(((validos / totalEvaluado) * 100).toFixed(1)) : 0,
  };
}

// --- Seguimiento longitudinal (sección 15 / 31) ------------------------------

export interface SeguimientoLongitudinal {
  unaEvaluacion: number;
  dosATresEvaluaciones: number;
  cuatroOMasEvaluaciones: number;
  totalPersonas: number;
  promedioEvaluacionesPorPersona: number;
}

export function construirSeguimientoLongitudinal(registros: RegistroValidado[]): SeguimientoLongitudinal {
  const conteoPorMatricula = new Map<string, number>();
  registros.forEach((r) => {
    conteoPorMatricula.set(r.Matricula, (conteoPorMatricula.get(r.Matricula) ?? 0) + 1);
  });

  let unaEvaluacion = 0, dosATresEvaluaciones = 0, cuatroOMasEvaluaciones = 0;
  conteoPorMatricula.forEach((n) => {
    if (n === 1) unaEvaluacion++;
    else if (n <= 3) dosATresEvaluaciones++;
    else cuatroOMasEvaluaciones++;
  });

  const totalPersonas = conteoPorMatricula.size;
  const promedioEvaluacionesPorPersona = totalPersonas
    ? Number((registros.length / totalPersonas).toFixed(2))
    : 0;

  return { unaEvaluacion, dosATresEvaluaciones, cuatroOMasEvaluaciones, totalPersonas, promedioEvaluacionesPorPersona };
}

export interface DistribucionItem {
  label: string;
  count: number;
}

// --- Matriz de riesgo (sección 28) --------------------------------------------

// --- Evolución histórica (sección 29-30) --------------------------------------

export type MetodoEvolucion = "promedio" | "mediana";

export interface PuntoEvolucion {
  periodo: string;
  valor: number | null;
  n: number;
}

// periodicidad "anio" agrupa por año; "mes" agrupa por año-mes (YYYY-MM).
export function construirEvolucionHistorica(
  registros: RegistroValidado[],
  campo: IndicadorClave,
  metodo: MetodoEvolucion = "promedio",
  periodicidad: "anio" | "mes" = "anio"
): PuntoEvolucion[] {
  const porPeriodo = new Map<string, number[]>();

  registros.forEach((r) => {
    if (!r.Fecha.valida) return;
    const valor = obtenerValor(r, campo);
    if (valor == null) return;

    const fecha = new Date(r.Fecha.original as string);
    const periodo = periodicidad === "anio"
      ? String(fecha.getFullYear())
      : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

    const arr = porPeriodo.get(periodo) ?? [];
    arr.push(valor);
    porPeriodo.set(periodo, arr);
  });

  return Array.from(porPeriodo.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, valores]) => {
      const stats = calcularEstadisticas(valores);
      return { periodo, valor: metodo === "promedio" ? stats.media : stats.mediana, n: stats.n };
    });
}

// --- Composición categórica en el tiempo (área apilada / porcentual) -----------
// Agrupa por periodo (año o mes) usando siempre Fecha (dato mucho más confiable
// que FechaNacimiento, que suele faltar), evitando depender de la edad cuando ésta
// no se puede calcular para buena parte de la población.

export function evolucionComposicion(
  registros: RegistroValidado[],
  categoriaFn: (r: RegistroValidado) => string | null,
  periodicidad: "anio" | "mes" = "anio"
): Record<string, any>[] {
  const porPeriodo = new Map<string, Map<string, number>>();

  registros.forEach((r) => {
    if (!r.Fecha.valida) return;
    const categoria = categoriaFn(r);
    if (categoria == null) return;

    const fecha = new Date(r.Fecha.original as string);
    const periodo = periodicidad === "anio"
      ? String(fecha.getFullYear())
      : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

    if (!porPeriodo.has(periodo)) porPeriodo.set(periodo, new Map());
    const categorias = porPeriodo.get(periodo)!;
    categorias.set(categoria, (categorias.get(categoria) ?? 0) + 1);
  });

  return Array.from(porPeriodo.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, categorias]) => {
      const row: Record<string, any> = { periodo };
      let total = 0;
      categorias.forEach((n, categoria) => { row[categoria] = n; total += n; });
      row.total = total;
      return row;
    });
}

// --- Relaciones entre indicadores (sección 27) --------------------------------

export interface PuntoRelacion {
  matricula: string;
  x: number;
  y: number;
}

export function construirRelacion(
  registros: RegistroValidado[],
  campoX: IndicadorClave,
  campoY: IndicadorClave
): PuntoRelacion[] {
  const puntos: PuntoRelacion[] = [];
  registros.forEach((r) => {
    const x = obtenerValor(r, campoX);
    const y = obtenerValor(r, campoY);
    if (x != null && y != null) puntos.push({ matricula: r.Matricula, x, y });
  });
  return puntos;
}

// --- Histograma genérico (usado por Cardiovascular / Metabólico) --------------

export function histograma(valores: number[], tamanoIntervalo: number): DistribucionItem[] {
  if (valores.length === 0) return [];
  const min = Math.floor(Math.min(...valores) / tamanoIntervalo) * tamanoIntervalo;
  const max = Math.ceil(Math.max(...valores) / tamanoIntervalo) * tamanoIntervalo;
  const buckets = new Map<number, number>();

  for (let inicio = min; inicio < max; inicio += tamanoIntervalo) {
    buckets.set(inicio, 0);
  }

  valores.forEach((v) => {
    const inicio = Math.floor(v / tamanoIntervalo) * tamanoIntervalo;
    buckets.set(inicio, (buckets.get(inicio) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([inicio, count]) => ({ label: `${inicio}-${inicio + tamanoIntervalo}`, count }));
}

// Etiqueta del intervalo de histograma que contiene un valor dado — usado para
// alinear una ReferenceLine (p. ej. promedio o mediana) con la barra exacta que
// le corresponde en un histograma categórico construido con `histograma()`.
export function bucketDeValor(valor: number, tamanoIntervalo: number): string {
  const inicio = Math.floor(valor / tamanoIntervalo) * tamanoIntervalo;
  return `${inicio}-${inicio + tamanoIntervalo}`;
}

// Histograma conjunto: varias series (p. ej. Sistólica y Diastólica) comparten los
// mismos intervalos, para poder mostrarlas en una sola gráfica en vez de dos
// separadas — son un mismo conjunto de mediciones (presión arterial), no valores
// independientes entre sí.
export function histogramaConjunto(
  seriesValores: Record<string, number[]>,
  tamanoIntervalo: number
): Record<string, any>[] {
  const todos = Object.values(seriesValores).flat();
  if (todos.length === 0) return [];

  const min = Math.floor(Math.min(...todos) / tamanoIntervalo) * tamanoIntervalo;
  const max = Math.ceil(Math.max(...todos) / tamanoIntervalo) * tamanoIntervalo;

  const filas: Record<string, any>[] = [];
  for (let inicio = min; inicio < max; inicio += tamanoIntervalo) {
    const fin = inicio + tamanoIntervalo;
    const fila: Record<string, any> = { label: `${inicio}-${fin}` };
    Object.entries(seriesValores).forEach(([nombre, valores]) => {
      fila[nombre] = valores.filter((v) => v >= inicio && v < fin).length;
    });
    filas.push(fila);
  }
  return filas;
}

// --- Comparación entre grupos (secciones 24/25/26: "IMC por grupo etario/sexo/depto") --

export interface ResumenPorGrupo {
  label: string;
  promedio: number | null;
  mediana: number | null;
  n: number;
}

export function promedioPorGrupo(
  registros: RegistroValidado[],
  campo: IndicadorClave,
  categoriaFn: (r: RegistroValidado) => string | null
): ResumenPorGrupo[] {
  const porGrupo = new Map<string, number[]>();

  registros.forEach((r) => {
    const categoria = categoriaFn(r);
    if (!categoria) return;
    const valor = obtenerValor(r, campo);
    if (valor == null) return;
    const arr = porGrupo.get(categoria) ?? [];
    arr.push(valor);
    porGrupo.set(categoria, arr);
  });

  return Array.from(porGrupo.entries())
    .map(([label, valores]) => {
      const stats = calcularEstadisticas(valores);
      return { label, promedio: stats.media, mediana: stats.mediana, n: stats.n };
    })
    .sort((a, b) => b.n - a.n);
}

// --- Tablas cruzadas (fila x columna) -------------------------------------------
// Usadas para comparaciones de dos dimensiones a la vez (p. ej. IMC promedio por
// grupo etario Y sexo, o conteo por categoría OMS Y sexo).

export function pivotPromedio(
  registros: RegistroValidado[],
  campo: IndicadorClave,
  filaFn: (r: RegistroValidado) => string | null,
  columnaFn: (r: RegistroValidado) => string | null
): Record<string, any>[] {
  const filas = new Map<string, Map<string, number[]>>();

  registros.forEach((r) => {
    const fila = filaFn(r);
    const columna = columnaFn(r);
    const valor = obtenerValor(r, campo);
    if (fila == null || columna == null || valor == null) return;
    if (!filas.has(fila)) filas.set(fila, new Map());
    const cols = filas.get(fila)!;
    if (!cols.has(columna)) cols.set(columna, []);
    cols.get(columna)!.push(valor);
  });

  return Array.from(filas.entries()).map(([fila, cols]) => {
    const row: Record<string, any> = { fila };
    cols.forEach((valores, columna) => {
      row[columna] = calcularEstadisticas(valores).media;
    });
    return row;
  });
}

// --- Filtros -------------------------------------------------------------------

// --- Matrices de seguimiento poblacional (Riesgo y Consultas por Departamento) --

export interface DistribucionRiesgoDepto {
  depto: string;
  sano: number;
  moderado: number;
  alto: number;
  sinDato: number;
}

// Estado actual (una lectura por persona) agrupado por departamento y nivel de
// riesgo — mismo criterio que clasificarRiesgo ya usa en el resto del
// dashboard. "critico" no aplica a Riesgo (solo 1/2/3), pero se agrupa junto
// con "alto" por si el catálogo llegara a ampliarse.
//
// Se agrupa por Depto_Series (más granular que Depto_nombre, que agrupa varios
// departamentos reales en categorías amplias — ver RawIndicadorRow en backend)
// para que cada barra represente un departamento real, no una categoría.
export function distribucionRiesgoPorDepartamento(estadoActual: RegistroValidado[]): DistribucionRiesgoDepto[] {
  const porDepto = new Map<string, DistribucionRiesgoDepto>();

  estadoActual.forEach((r) => {
    if (!r.Depto_Series) return;
    const bucket = porDepto.get(r.Depto_Series) ?? { depto: r.Depto_Series, sano: 0, moderado: 0, alto: 0, sinDato: 0 };

    const nivel = clasificarRiesgo(r.Riesgo).nivel;
    if (nivel === "normal") bucket.sano++;
    else if (nivel === "leve") bucket.moderado++;
    else if (nivel === "alto" || nivel === "critico") bucket.alto++;
    else bucket.sinDato++;

    porDepto.set(r.Depto_Series, bucket);
  });

  return Array.from(porDepto.values()).sort(
    (a, b) => (b.sano + b.moderado + b.alto + b.sinDato) - (a.sano + a.moderado + a.alto + a.sinDato)
  );
}

export interface ProtocoloConteo {
  nombre: string;
  count: number;
}

export interface ConsultasDepto {
  depto: string;
  total: number;
  protocolos: ProtocoloConteo[];
}

// Todos los años con al menos una FechaConsulta válida — alimenta el selector
// de año del gráfico de consultas por departamento.
export function aniosDisponiblesConsultas(consultas: RegistroConsultaValidado[]): number[] {
  const anios = new Set<number>();
  consultas.forEach((c) => {
    if (!c.FechaConsulta.valida || !c.FechaConsulta.original) return;
    anios.add(new Date(c.FechaConsulta.original).getFullYear());
  });
  return Array.from(anios).sort((a, b) => a - b);
}

// Consultas de un año dado, agrupadas por departamento (Depto_Series, mismo
// criterio granular que distribucionRiesgoPorDepartamento — se excluyen las
// consultas sin Depto_Series) y por protocolo dentro de cada uno (mismo
// criterio de nombre que ConstruirMatrizProtocolos en el servicio SOAP:
// TipoProtocolo, con fallback a TipoAtencion).
export function construirConsultasPorDepartamento(consultas: RegistroConsultaValidado[], anio: number): ConsultasDepto[] {
  const porDepto = new Map<string, Map<string, number>>();

  consultas.forEach((c) => {
    if (!c.FechaConsulta.valida || !c.FechaConsulta.original || !c.Depto_Series) return;
    if (new Date(c.FechaConsulta.original).getFullYear() !== anio) return;

    const nombreProtocolo = c.TipoProtocolo?.trim() || c.TipoAtencion?.trim() || "Sin clasificar";
    const protocolos = porDepto.get(c.Depto_Series) ?? new Map<string, number>();
    protocolos.set(nombreProtocolo, (protocolos.get(nombreProtocolo) ?? 0) + 1);
    porDepto.set(c.Depto_Series, protocolos);
  });

  return Array.from(porDepto.entries())
    .map(([depto, protocolos]) => {
      const lista = Array.from(protocolos.entries())
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count);
      return { depto, total: lista.reduce((acc, p) => acc + p.count, 0), protocolos: lista };
    })
    .sort((a, b) => b.total - a.total);
}

// --- Asistencia anual (visitas por año, comparadas contra el año anterior) ----

export interface VisitasAnio {
  anio: number;
  total: number;
}

// "Visita" = una fila con Fecha válida (un evento, no una persona distinta —
// la misma persona puede aportar varias visitas en un año). Las filas
// marcadas esDuplicado (mismo Matricula+Fecha repetido, ver marcarDuplicados)
// se excluyen para no inflar el conteo con lo que ya se identificó como dato
// repetido, no como dos visitas reales.
export function construirVisitasPorAnio(registros: RegistroValidado[]): VisitasAnio[] {
  const conteo = new Map<number, number>();
  registros.forEach((r) => {
    if (!r.Fecha.valida || !r.Fecha.original || r.esDuplicado) return;
    const anio = new Date(r.Fecha.original).getFullYear();
    conteo.set(anio, (conteo.get(anio) ?? 0) + 1);
  });
  return Array.from(conteo.entries())
    .map(([anio, total]) => ({ anio, total }))
    .sort((a, b) => a.anio - b.anio);
}

export interface VisitaAnioConTendencia extends VisitasAnio {
  // % de cambio contra el año inmediato anterior en la serie COMPLETA (no
  // contra el primer año visible, si el control de rango recorta cuántos
  // años se muestran) — null si es el primer año con datos, sin punto de
  // comparación.
  cambioPct: number | null;
}

// Una barra por año (ya no pares "año/año anterior" agrupados) — la
// tendencia contra el año previo se conserva para el tooltip, calculada
// sobre TODOS los años disponibles antes de que el componente recorte a
// "últimos N".
export function construirVisitasAnualesConTendencia(visitasPorAnio: VisitasAnio[]): VisitaAnioConTendencia[] {
  return visitasPorAnio.map((v, i) => {
    const anterior = visitasPorAnio[i - 1];
    const cambioPct = anterior && anterior.total > 0
      ? Number((((v.total - anterior.total) / anterior.total) * 100).toFixed(1))
      : null;
    return { ...v, cambioPct };
  });
}

export interface VisitasDepto {
  depto: string;
  total: number;
}

// Detalle del drill-down: visitas de un año específico, por Depto_Series
// (más granular que Depto_nombre — mismo criterio ya adoptado en
// distribucionRiesgoPorDepartamento).
export function construirVisitasPorDepartamento(registros: RegistroValidado[], anio: number): VisitasDepto[] {
  const conteo = new Map<string, number>();
  registros.forEach((r) => {
    if (!r.Fecha.valida || !r.Fecha.original || r.esDuplicado || !r.Depto_Series) return;
    if (new Date(r.Fecha.original).getFullYear() !== anio) return;
    conteo.set(r.Depto_Series, (conteo.get(r.Depto_Series) ?? 0) + 1);
  });
  return Array.from(conteo.entries())
    .map(([depto, total]) => ({ depto, total }))
    .sort((a, b) => b.total - a.total);
}

export interface SegmentoAgrupado {
  depto: string;
  total: number;
  esOtros: boolean;
  // Solo presente cuando esOtros=true: el desglose real de los departamentos
  // que se agruparon, para mostrarlo en el tooltip.
  detalle?: VisitasDepto[];
}

const UMBRAL_OTROS = 0.04;

// Agrupa departamentos con menos de UMBRAL_OTROS (4%) del total en una sola
// categoría "Otros" — evita rebanadas/segmentos tan chicos que no se puedan
// seleccionar o leer en el gráfico. El detalle real de qué queda dentro de
// "Otros" se conserva para el tooltip, no se pierde.
export function agruparDepartamentosPequenos(datos: VisitasDepto[], umbral = UMBRAL_OTROS): SegmentoAgrupado[] {
  const total = datos.reduce((acc, d) => acc + d.total, 0);
  if (!total) return [];

  const grandes: SegmentoAgrupado[] = [];
  const pequenos: VisitasDepto[] = [];
  datos.forEach((d) => {
    if (d.total / total < umbral) pequenos.push(d);
    else grandes.push({ depto: d.depto, total: d.total, esOtros: false });
  });

  if (pequenos.length > 0) {
    grandes.push({
      depto: "Otros",
      total: pequenos.reduce((acc, d) => acc + d.total, 0),
      esOtros: true,
      detalle: pequenos.slice().sort((a, b) => b.total - a.total),
    });
  }

  return grandes.sort((a, b) => b.total - a.total);
}

export function aplicarFiltros(registros: RegistroValidado[], filtros: Filtros): RegistroValidado[] {
  return registros.filter((r) => {
    if (filtros.anioDesde != null || filtros.anioHasta != null) {
      if (!r.Fecha.valida) return false;
      const anio = new Date(r.Fecha.original as string).getFullYear();
      if (filtros.anioDesde != null && anio < filtros.anioDesde) return false;
      if (filtros.anioHasta != null && anio > filtros.anioHasta) return false;
    }
    if (filtros.departamento && r.Depto_nombre !== filtros.departamento) return false;
    if (filtros.sexo && r.Sexo !== filtros.sexo) return false;
    if (filtros.nivelRiesgo && clasificarRiesgo(r.Riesgo).label !== filtros.nivelRiesgo) return false;
    if (filtros.tipoEmpleado && clasificarTipoEmpleado(r.Categoria_desc) !== filtros.tipoEmpleado) return false;
    return true;
  });
}
