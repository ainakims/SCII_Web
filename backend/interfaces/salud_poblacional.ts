// Tipos del motor de datos del Dashboard de Análisis de Salud Poblacional.
// Ver especificación funcional (documento entregado por el usuario) secciones 3, 6-12 y 39.

export const EstadoValor = {
  VALIDO: "VALIDO",
  FALTANTE: "FALTANTE",
  PENDIENTE: "PENDIENTE",
  NO_APLICA: "NO_APLICA",
  INVALIDO: "INVALIDO",
  FUERA_DE_RANGO: "FUERA_DE_RANGO",
  INCONSISTENTE: "INCONSISTENTE",
} as const;

export type EstadoValor = typeof EstadoValor[keyof typeof EstadoValor];

// Fila cruda tal como la regresa el stored procedure (sección 3 del documento).
// NOTA: el nombre/contrato exacto del SP se confirmará después; esta forma es la
// que describe la especificación funcional.
export interface RawIndicadorRow {
  Id: number;
  Matricula: string;
  Sistolica: number | null;
  Diastolica: number | null;
  Glucosa: string | null;
  Colesterol: string | null;
  Trigliceridos: string | null;
  Peso: number | null;
  Altura: number | null;
  PA: string | null;
  IMC: number | null;
  ICT: number | null;
  Riesgo: number | null;
  Fecha: string | null;
  FechaNacimiento: string | null;
  Categoria_desc: string | null;
  Depto_nombre: string | null;
  Especialidad: string | null;
  // Confirmado por el SP real: 'M' | 'F' | NULL. Se normaliza a "Masculino" /
  // "Femenino" / null en poblacionValidacion.service.ts (normalizarSexo).
  Sexo: string | null;
}

export interface ValorNormalizado<T = number> {
  original: string | number | null;
  numerico: T | null;
  estado: EstadoValor;
  motivo?: string;
}

export interface FechaValidada {
  original: string | null;
  valida: boolean;
  motivo?: string;
}

export interface EstadoImc {
  original: number | null;
  calculado: number | null;
  usado: number | null;
  estado: EstadoValor;
  motivo?: string;
}

// Registro completo después de normalización + validación (capa "ValidatedData", sección 39.C).
// Es lo que expone el endpoint /SaludPoblacional/ObtenerDatos.
export interface RegistroValidado {
  Id: number;
  Matricula: string;
  Fecha: FechaValidada;
  FechaNacimiento: FechaValidada;

  Sistolica: ValorNormalizado;
  Diastolica: ValorNormalizado;
  Glucosa: ValorNormalizado;
  Colesterol: ValorNormalizado;
  Trigliceridos: ValorNormalizado;
  Peso: ValorNormalizado;
  Altura: ValorNormalizado;
  PA: ValorNormalizado;
  ICT: ValorNormalizado;
  IMC: EstadoImc;

  Riesgo: number | null;
  Categoria_desc: string | null;
  Depto_nombre: string | null;
  Especialidad: string | null;
  Sexo: string | null;

  esDuplicado: boolean;
}
