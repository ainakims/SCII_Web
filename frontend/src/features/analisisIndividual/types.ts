// Espejo de backend/interfaces/analisis_individual.ts — nombres PascalCase
// exactos al contrato del servicio SOAP EvaluarSaludConAnalisisIA.

export type Prioridad = "Baja" | "Media" | "Alta" | "Critica";
export type NivelRiesgo = 1 | 2 | 3 | null;
export type EstatusAsistencia = "ok" | "miss" | "future";
export type OrigenLectura = "Programa" | "Consulta";

export interface HallazgoRelevante {
  Tema: string;
  Descripcion: string;
  IndicadoresRelacionados: string[];
}

export interface DiagnosticoDiferencialItem {
  Condicion: string;
  EvidenciaQueLoRespalda: string;
  QueFaltaParaConfirmarODescartar: string;
}

export interface EvolucionYRiesgosPotenciales {
  ImplicacionesSiPersiste: string[];
  FactoresQueAumentanIncertidumbre: string[];
}

export interface PrioridadYUrgencia {
  Prioridad: Prioridad;
  Justificacion: string;
  Urgente: boolean;
  Recomendacion: string;
}

export interface AptitudLaboral {
  Apto: boolean;
  Justificacion: string;
  FactoresDeRiesgoDetectados: string[];
  Recomendacion: string;
}

export interface EvolucionPesoAnual {
  Fechas: string[];
  PesoReal: (number | null)[];
  PesoIdeal: (number | null)[];
}

export interface EvolucionIMC {
  ValoresIMC: (number | null)[];
  NivelRiesgo: NivelRiesgo[];
}

export interface PerfilMetabolico {
  Glucosa: (number | null)[];
  Colesterol: (number | null)[];
  Trigliceridos: (number | null)[];
  UmbralGlucosa: number | null;
  UmbralColesterol: number | null;
  UmbralTrigliceridos: number | null;
}

export interface PresionArterial {
  Fechas: string[];
  Sistolica: (number | null)[];
  Diastolica: (number | null)[];
  FrecuenciaCardiaca: (number | null)[];
  Origen: OrigenLectura[];
}

export interface HeatmapAsistenciaMes {
  Mes: string;
  Estatus: EstatusAsistencia;
  Riesgo: NivelRiesgo;
}

// Un elemento por cada año con registros. El componente navega entre años con
// flechas; por defecto se muestra el año actual si viene incluido, o si no el
// más reciente del arreglo (ver components/HeatmapAsistencia.tsx).
export interface HeatmapAsistenciaAnio {
  Anio: number;
  Meses: HeatmapAsistenciaMes[];
}

// Conteo de consultas de un protocolo específico dentro de un año. `ConteoMeses`
// siempre trae 12 elementos (Ene→Dic); los meses futuros del año en curso
// simplemente son 0, no hay un estado especial como en HeatmapAsistenciaMes.
export interface ConteoProtocoloAnio {
  Anio: number;
  ConteoMeses: number[];
}

export interface MatrizProtocoloItem {
  IdProtocolo: number;
  Nombre: string;
  // Identidad estable por protocolo a través de los años: un elemento por cada
  // año en que ESE protocolo tuvo al menos una consulta.
  ConteoPorAnio: ConteoProtocoloAnio[];
}

export interface HistoricosYGraficas {
  Meses: string[];
  EvolucionPesoAnual: EvolucionPesoAnual;
  EvolucionIMC: EvolucionIMC;
  PerfilMetabolico: PerfilMetabolico;
  PresionArterial: PresionArterial;
  HeatmapAsistencia: HeatmapAsistenciaAnio[];
  MatrizProtocolos: MatrizProtocoloItem[];
  Enfermedades: string[];
}

export interface AnalisisIndividualResult {
  HallazgosRelevantes: HallazgoRelevante[];
  DiagnosticoDiferencial: DiagnosticoDiferencialItem[];
  EvolucionYRiesgosPotenciales: EvolucionYRiesgosPotenciales;
  PrioridadYUrgencia: PrioridadYUrgencia;
  AptitudLaboral: AptitudLaboral;
  HistoricosYGraficas: HistoricosYGraficas;
}
