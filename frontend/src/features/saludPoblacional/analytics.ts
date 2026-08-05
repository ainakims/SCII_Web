// Funciones puras de agregación para el Dashboard de Salud Poblacional.
// Reciben siempre el arreglo ya filtrado (mismo patrón que Indicadores.tsx: el
// backend regresa filas normalizadas, el frontend construye todas las agregaciones).
//
// Principio (sección 32 del documento): cada indicador usa su propio conjunto de
// valores válidos como denominador; nunca se comparte un único denominador global.

import { RegistroValidado, ValorNormalizado, EstadisticasIndicador, Filtros } from "./types";
import { GRUPOS_ETARIOS, clasificarGrupoEtario, clasificarRiesgo, clasificarTipoEmpleado, Clasificacion } from "./clinicalRules";

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

// --- Demografía (sección 23) --------------------------------------------------

export interface DistribucionItem {
  label: string;
  count: number;
}

export function distribucionPorCampo(
  estadoActual: RegistroValidado[],
  campo: "Depto_nombre" | "Especialidad" | "Categoria_desc" | "Sexo"
): DistribucionItem[] {
  const conteo = new Map<string, number>();
  estadoActual.forEach((r) => {
    const valor = (r[campo] ?? "").toString().trim();
    if (!valor) return;
    conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
  });
  return Array.from(conteo.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function distribucionEdad(estadoActual: RegistroValidado[]): DistribucionItem[] {
  const conteo = new Map<string, number>(GRUPOS_ETARIOS.map((g) => [g.label, 0]));
  conteo.set("No clasificado", 0);

  estadoActual.forEach((r) => {
    const edad = calcularEdad(r.FechaNacimiento.original, r.Fecha.original);
    const grupo = clasificarGrupoEtario(edad);
    conteo.set(grupo, (conteo.get(grupo) ?? 0) + 1);
  });

  return Array.from(conteo.entries()).map(([label, count]) => ({ label, count }));
}

// --- Matriz de riesgo (sección 28) --------------------------------------------

export interface CeldaMatrizRiesgo {
  grupoEtario: string;
  n: number;
  elevadoPct: number;
}

export function construirMatrizRiesgo(
  estadoActual: RegistroValidado[],
  campo: IndicadorClave,
  clasificador: (valor: number | null) => Clasificacion
): CeldaMatrizRiesgo[] {
  const grupos = [...GRUPOS_ETARIOS.map((g) => g.label), "No clasificado"];

  return grupos.map((grupoEtario) => {
    const personasGrupo = estadoActual.filter((r) => {
      const edad = calcularEdad(r.FechaNacimiento.original, r.Fecha.original);
      return clasificarGrupoEtario(edad) === grupoEtario;
    });

    const conDato = personasGrupo.filter((r) => obtenerValor(r, campo) != null);
    const elevados = conDato.filter((r) => {
      const nivel = clasificador(obtenerValor(r, campo)).nivel;
      return nivel === "alto" || nivel === "critico";
    });

    return {
      grupoEtario,
      n: conDato.length,
      elevadoPct: conDato.length ? Number(((elevados.length / conDato.length) * 100).toFixed(1)) : 0,
    };
  }).filter((celda) => celda.grupoEtario !== "No clasificado" || celda.n > 0);
}

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

export function pivotConteo(
  registros: RegistroValidado[],
  filaFn: (r: RegistroValidado) => string | null,
  columnaFn: (r: RegistroValidado) => string | null
): Record<string, any>[] {
  const filas = new Map<string, Map<string, number>>();

  registros.forEach((r) => {
    const fila = filaFn(r);
    const columna = columnaFn(r);
    if (fila == null || columna == null) return;
    if (!filas.has(fila)) filas.set(fila, new Map());
    const cols = filas.get(fila)!;
    cols.set(columna, (cols.get(columna) ?? 0) + 1);
  });

  return Array.from(filas.entries()).map(([fila, cols]) => {
    const row: Record<string, any> = { fila };
    cols.forEach((count, columna) => { row[columna] = count; });
    return row;
  });
}

// --- Regresión lineal (mínimos cuadrados) — sección "Relaciones y Tendencias" ---

export interface ResultadoRegresion {
  n: number;
  m: number | null; // pendiente
  b: number | null; // intersección
  r: number | null; // correlación de Pearson
  r2Pct: number | null; // % de varianza explicada
}

export function regresionLineal(puntosCrudos: { x: number; y: number }[]): ResultadoRegresion {
  // Defensa adicional: un solo punto no numérico (NaN) contamina toda la suma.
  const puntos = puntosCrudos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = puntos.length;
  if (n < 2) return { n, m: null, b: null, r: null, r2Pct: null };

  const meanX = puntos.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = puntos.reduce((acc, p) => acc + p.y, 0) / n;

  let ssXX = 0, ssYY = 0, ssXY = 0;
  puntos.forEach((p) => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  });

  if (ssXX === 0) return { n, m: null, b: null, r: null, r2Pct: null };

  const m = ssXY / ssXX;
  const b = meanY - m * meanX;
  const r = ssYY === 0 ? null : ssXY / Math.sqrt(ssXX * ssYY);

  return {
    n,
    m: Number(m.toFixed(4)),
    b: Number(b.toFixed(2)),
    r: r != null ? Number(r.toFixed(3)) : null,
    r2Pct: r != null ? Number((r * r * 100).toFixed(1)) : null,
  };
}

export function etiquetaCorrelacion(r: number | null): string {
  if (r == null) return "Sin datos suficientes";
  const abs = Math.abs(r);
  if (abs >= 0.7) return "Fuerte";
  if (abs >= 0.4) return "Moderada";
  if (abs >= 0.2) return "Débil";
  return "Muy débil / nula";
}

// --- Filtros -------------------------------------------------------------------

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
