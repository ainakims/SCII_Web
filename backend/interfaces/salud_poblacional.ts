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
  // Alias real que regresa el SP: un CASE que agrupa varios Depto_nombre en
  // categorías más amplias (PRODUCCION Y MANTENIMIENTO, PROYECTOS, VENTAS, ...).
  Departamento: string | null;
  // Nombre de departamento sin agrupar (más granular que Departamento), usado
  // para desglosar por serie en gráficas como "Departamento IMC".
  Depto_Series: string | null;
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
  Depto_Series: string | null;
  Especialidad: string | null;
  Sexo: string | null;

  esDuplicado: boolean;
}

// Fila cruda del @Case=3 de SCII_Valores_Indicadores (consultas puntuales, un
// encuentro clínico por fila) — mismo shape que RegistroConsulta en el
// servicio SOAP individual (EvaluacionSalud.asmx), pero sin filtrar por
// matrícula: trae las consultas de toda la plantilla según @Activo.
export interface RawConsultaRow {
  Matricula: string;
  TipoAtencion: string | null;
  TipoProtocolo: string | null;
  Procedimiento: string | null;
  Padecimiento_Sintomas: string | null;
  PesoenKg: number | null;
  Altura: number | null;
  IMC: number | null;
  Abdomen: string | null;
  IndiceCinturaTalla: number | null;
  SpO2: number | null;
  PresionArterial: string | null;
  FrecuenciaCardiaca: string | null;
  FrecuenciaRespiratoria: string | null;
  FechaConsulta: string | null;
}

// Registro de consulta ya validado (capa "ValidatedData", mismo principio que
// RegistroValidado): agrega Depto_nombre (resuelto del catálogo @Case=2, la
// consulta en sí no trae departamento) para poder agrupar por departamento.
export interface RegistroConsultaValidado {
  Matricula: string;
  FechaConsulta: FechaValidada;
  TipoAtencion: string | null;
  TipoProtocolo: string | null;
  Depto_nombre: string | null;
}
