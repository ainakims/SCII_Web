// Tipos espejo de backend/interfaces/salud_poblacional.ts

export type EstadoValor =
  | "VALIDO"
  | "FALTANTE"
  | "PENDIENTE"
  | "NO_APLICA"
  | "INVALIDO"
  | "FUERA_DE_RANGO"
  | "INCONSISTENTE";

export interface ValorNormalizado {
  original: string | number | null;
  numerico: number | null;
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
  Depto_Series: string | null;
  Especialidad: string | null;
  Sexo: string | null;

  esDuplicado: boolean;
}

export type GrupoEtario = "18-29" | "30-39" | "40-49" | "50-59" | "60+" | "No clasificado";

export type NivelRiesgoFiltro = "Sano" | "Riesgo moderado" | "Riesgo alto" | "Sin clasificar";

export type TipoEmpleado = "Confianza" | "Sindicalizado";

export interface Filtros {
  anioDesde: number | null;
  anioHasta: number | null;
  departamento: string | null;
  sexo: string | null;
  nivelRiesgo: NivelRiesgoFiltro | null;
  tipoEmpleado: TipoEmpleado | null;
}

export const FILTROS_VACIOS: Filtros = {
  anioDesde: null,
  anioHasta: null,
  departamento: null,
  sexo: null,
  nivelRiesgo: null,
  tipoEmpleado: null,
};

export interface EstadisticasIndicador {
  n: number;
  media: number | null;
  mediana: number | null;
  min: number | null;
  max: number | null;
  p25: number | null;
  p75: number | null;
  desviacion: number | null;
}
