// Motor de normalización y validación de datos clínicos del Dashboard de Salud Poblacional.
// Implementa las reglas de las secciones 6 a 12 y 16-17 de la especificación funcional:
// nunca convertir NULL en cero, nunca descartar registros silenciosamente, y distinguir
// "técnicamente inválido" de "clínicamente extremo pero válido".

import { EstadoValor, RawIndicadorRow, RegistroValidado, ValorNormalizado, FechaValidada, EstadoImc } from "../interfaces/salud_poblacional";

// Tokens no numéricos conocidos en los campos varchar (Glucosa/Colesterol/Trigliceridos/PA).
// Ver sección 8 del documento. Cualquier otro texto no numérico se marca INVALIDO.
const TOKENS_PENDIENTE = new Set(["PEN", "PEND", "PENDIENTE"]);
const TOKENS_NO_APLICA = new Set(["N/A", "NA", "NO APLICA", "SIN DATO", "-", "—"]);

// Rangos de plausibilidad clínica por indicador. Son valores de referencia estándar,
// NO un protocolo oficial confirmado (sección 44 del documento lo deja pendiente).
// Un valor fuera de este rango se conserva pero se marca FUERA_DE_RANGO (sección 9).
const RANGOS_PLAUSIBLES: Record<string, [number, number]> = {
  Sistolica: [60, 260],
  Diastolica: [30, 160],
  Glucosa: [30, 600],
  Colesterol: [50, 500],
  Trigliceridos: [20, 1500],
  Peso: [25, 250],
  Altura: [1.2, 2.2],
  PA: [40, 200],
  ICT: [20, 150],
  IMC: [10, 80],
};

function limpiarTexto(raw: string): string {
  return raw.trim().toUpperCase();
}

// Coerción numérica defensiva para campos que la interfaz declara como numéricos
// (IMC, Riesgo) pero que el driver de SQL Server puede entregar en un formato
// inesperado. Un valor no numérico sin filtrar aquí se propagaría como NaN a
// través de cualquier suma/promedio posterior en el frontend.
function coerceNumeroFinito(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const numerico = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numerico) ? numerico : null;
}

// Normaliza el campo Sexo (M/F/NULL) a una etiqueta legible. Cualquier otro
// valor no reconocido se trata como dato faltante (no se asume).
export function normalizarSexo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const texto = limpiarTexto(String(raw));
  if (texto === "M" || texto === "MASCULINO") return "Masculino";
  if (texto === "F" || texto === "FEMENINO") return "Femenino";
  return null;
}

// Normaliza un valor clínico (numérico nativo o texto) a { original, numerico, estado, motivo }.
// `campo` se usa para buscar el rango de plausibilidad correspondiente.
export function normalizarValorClinico(raw: string | number | null | undefined, campo: string): ValorNormalizado {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { original: raw ?? null, numerico: null, estado: EstadoValor.FALTANTE };
  }

  if (typeof raw === "string") {
    const texto = limpiarTexto(raw);
    if (TOKENS_PENDIENTE.has(texto)) {
      return { original: raw, numerico: null, estado: EstadoValor.PENDIENTE };
    }
    if (TOKENS_NO_APLICA.has(texto)) {
      return { original: raw, numerico: null, estado: EstadoValor.NO_APLICA };
    }
  }

  const numerico = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));

  if (!Number.isFinite(numerico)) {
    return { original: raw, numerico: null, estado: EstadoValor.INVALIDO, motivo: "No se pudo interpretar como número" };
  }

  const rango = RANGOS_PLAUSIBLES[campo];
  if (rango && (numerico < rango[0] || numerico > rango[1])) {
    return {
      original: raw,
      numerico,
      estado: EstadoValor.FUERA_DE_RANGO,
      motivo: `Fuera del rango plausible (${rango[0]}-${rango[1]})`,
    };
  }

  return { original: raw, numerico, estado: EstadoValor.VALIDO };
}

// Sección 12: valida Fecha / FechaNacimiento. No elimina el registro, solo lo marca
// como no apto para análisis temporales.
export function validarFecha(raw: string | null | undefined, opts?: { noFutura?: boolean; minima?: Date }): FechaValidada {
  if (!raw) {
    return { original: null, valida: false, motivo: "Fecha faltante" };
  }

  const fecha = new Date(raw);
  if (Number.isNaN(fecha.getTime())) {
    return { original: raw, valida: false, motivo: "Fecha inválida" };
  }

  if (opts?.noFutura && fecha.getTime() > Date.now()) {
    return { original: raw, valida: false, motivo: "Fecha futura" };
  }

  if (opts?.minima && fecha.getTime() < opts.minima.getTime()) {
    return { original: raw, valida: false, motivo: "Fecha anterior a la fecha de nacimiento" };
  }

  return { original: raw, valida: true };
}

// Sección 10: compara IMC reportado contra el calculado a partir de Peso/Altura.
// Tolerancia por defecto: ±10% o ±2 puntos (lo que sea mayor). Valor de referencia,
// pendiente de confirmación clínica oficial (sección 44).
const TOLERANCIA_IMC_RELATIVA = 0.10;
const TOLERANCIA_IMC_ABSOLUTA = 2;

export function detectarInconsistenciaIMC(
  pesoKg: number | null,
  alturaM: number | null,
  imcOriginal: number | null
): EstadoImc {
  const calculado = pesoKg != null && alturaM != null && alturaM > 0
    ? Number((pesoKg / (alturaM * alturaM)).toFixed(2))
    : null;

  if (imcOriginal == null && calculado == null) {
    return { original: null, calculado: null, usado: null, estado: EstadoValor.FALTANTE };
  }

  if (imcOriginal == null) {
    return { original: null, calculado, usado: calculado, estado: EstadoValor.VALIDO, motivo: "IMC derivado de peso/altura (no reportado)" };
  }

  const rango = RANGOS_PLAUSIBLES.IMC;
  const fueraDeRango = imcOriginal < rango[0] || imcOriginal > rango[1];

  if (calculado == null) {
    return {
      original: imcOriginal,
      calculado: null,
      usado: imcOriginal,
      estado: fueraDeRango ? EstadoValor.FUERA_DE_RANGO : EstadoValor.VALIDO,
    };
  }

  const tolerancia = Math.max(TOLERANCIA_IMC_ABSOLUTA, calculado * TOLERANCIA_IMC_RELATIVA);
  const inconsistente = Math.abs(imcOriginal - calculado) > tolerancia;

  return {
    original: imcOriginal,
    calculado,
    usado: imcOriginal,
    estado: inconsistente ? EstadoValor.INCONSISTENTE : (fueraDeRango ? EstadoValor.FUERA_DE_RANGO : EstadoValor.VALIDO),
    motivo: inconsistente ? `IMC reportado (${imcOriginal}) difiere del calculado (${calculado})` : undefined,
  };
}

// Sección 16-17: marca (sin eliminar) registros con la misma Matricula+Fecha.
export function marcarDuplicados(filas: RawIndicadorRow[]): Set<number> {
  const conteo = new Map<string, number[]>();

  filas.forEach((f) => {
    const clave = `${f.Matricula}__${f.Fecha}`;
    const ids = conteo.get(clave) ?? [];
    ids.push(f.Id);
    conteo.set(clave, ids);
  });

  const duplicados = new Set<number>();
  conteo.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicados.add(id));
  });

  return duplicados;
}

// Combina todas las validaciones anteriores para una fila cruda.
export function normalizarRegistro(fila: RawIndicadorRow, esDuplicado: boolean): RegistroValidado {
  const fechaNacimiento = validarFecha(fila.FechaNacimiento);
  const minimaFecha = fechaNacimiento.valida ? new Date(fila.FechaNacimiento as string) : undefined;
  const fecha = validarFecha(fila.Fecha, { noFutura: true, minima: minimaFecha });

  const peso = normalizarValorClinico(fila.Peso, "Peso");
  const altura = normalizarValorClinico(fila.Altura, "Altura");

  return {
    Id: fila.Id,
    Matricula: String(fila.Matricula ?? "").trim(),
    Fecha: fecha,
    FechaNacimiento: fechaNacimiento,

    Sistolica: normalizarValorClinico(fila.Sistolica, "Sistolica"),
    Diastolica: normalizarValorClinico(fila.Diastolica, "Diastolica"),
    Glucosa: normalizarValorClinico(fila.Glucosa, "Glucosa"),
    Colesterol: normalizarValorClinico(fila.Colesterol, "Colesterol"),
    Trigliceridos: normalizarValorClinico(fila.Trigliceridos, "Trigliceridos"),
    Peso: peso,
    Altura: altura,
    PA: normalizarValorClinico(fila.PA, "PA"),
    ICT: normalizarValorClinico(fila.ICT, "ICT"),
    IMC: detectarInconsistenciaIMC(peso.numerico, altura.numerico, coerceNumeroFinito(fila.IMC)),

    Riesgo: coerceNumeroFinito(fila.Riesgo),
    Categoria_desc: fila.Categoria_desc ?? null,
    Depto_nombre: fila.Departamento ?? null,
    Depto_Series: fila.Depto_Series ?? null,
    Especialidad: fila.Especialidad ?? null,
    Sexo: normalizarSexo(fila.Sexo),

    esDuplicado,
  };
}

export function normalizarPoblacion(filas: RawIndicadorRow[]): RegistroValidado[] {
  const duplicados = marcarDuplicados(filas);
  return filas.map((f) => normalizarRegistro(f, duplicados.has(f.Id)));
}
