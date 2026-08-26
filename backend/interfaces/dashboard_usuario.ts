import { FechaValidada } from "./salud_poblacional";

// Consulta puntual (SCII_Consultas) de un solo empleado, tal como la consume
// el Dashboard de Usuario: a diferencia de RegistroConsultaValidado (matriz
// poblacional de protocolos), aquí sí interesan los signos vitales tomados en
// consulta (PA/FC/IMC/Peso) porque alimentan las mismas gráficas que
// SCII_Indicadores.
export interface ConsultaPropia {
  FechaConsulta: FechaValidada;
  TipoAtencion: string | null;
  TipoProtocolo: string | null;
  Sistolica: number | null;
  Diastolica: number | null;
  FrecuenciaCardiaca: number | null;
  IMC: number | null;
  Peso: number | null;
}
