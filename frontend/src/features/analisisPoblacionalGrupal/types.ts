// Espejo de backend/interfaces/analisis_poblacional_grupal.ts — nombres
// PascalCase exactos al contrato del WebMethod SOAP EvaluarSaludGrupal.

export interface DistribucionItemGrupal {
  Categoria: string;
  Cantidad: number;
  Porcentaje: number;
}

export interface EstadisticaIndicador {
  Indicador: string;
  ConDatoDisponible: number;
  SinDatoDisponible: number;
  PromedioActual: number | null;
  DistribucionCategorias: DistribucionItemGrupal[];
  CoberturaBaja: boolean;
  TendenciaPredominante: string | null;
  ObservacionesConTendencia: number;
}

export interface ParticipacionDestacada {
  Indicador: string;
  Categoria: string;
  PorcentajeDelTotal: number;
}

export interface DepartamentoEstadistica {
  Nombre: string;
  TotalEvaluados: number;
  DistribucionEstadoGeneral: DistribucionItemGrupal[];
  EstadisticasPorIndicador: Record<string, EstadisticaIndicador>;
  DistribucionCondicionesNivelD: DistribucionItemGrupal[];
  ParticipacionesDestacadas: ParticipacionDestacada[];
}

export interface ResultadoPoblacional {
  TotalEvaluados: number;
  DistribucionEstadoGeneral: DistribucionItemGrupal[];
  EstadisticasPorIndicador: Record<string, EstadisticaIndicador>;
  DistribucionCondicionesNivelD: DistribucionItemGrupal[];
  PorDepartamento: DepartamentoEstadistica[];
}

export interface HallazgoDepartamentoIA {
  Nombre: string;
  Hallazgos: string[];
}

export interface ResumenGeneralIA {
  HallazgosPrincipales: string[];
  Recomendaciones: string[];
}

export interface AnalisisPoblacionalIA {
  Departamentos: HallazgoDepartamentoIA[];
  ResumenGeneral: ResumenGeneralIA;
}

export interface EvaluarSaludGrupalResult {
  Estadisticas: ResultadoPoblacional;
  Analisis: AnalisisPoblacionalIA;
}
