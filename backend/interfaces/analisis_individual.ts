// Contrato del JSON que regresa el servicio SOAP EvaluarSaludConAnalisisIA
// (EvaluacionSalud.asmx). Nombres de campos en PascalCase EXACTOS al contrato
// dado — no se convierten a camelCase para evitar bugs de mapeo con un formato
// que no controlamos nosotros.

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

export interface MatrizProtocoloItem {
  IdProtocolo: number;
  Nombre: string;
  ConteoMeses: number[];
}

export interface HistoricosYGraficas {
  Meses: string[];
  EvolucionPesoAnual: EvolucionPesoAnual;
  EvolucionIMC: EvolucionIMC;
  PerfilMetabolico: PerfilMetabolico;
  PresionArterial: PresionArterial;
  HeatmapAsistencia: HeatmapAsistenciaMes[];
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
