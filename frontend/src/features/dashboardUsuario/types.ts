import { FechaValidada } from "../saludPoblacional/types";

// Espejo de backend/interfaces/dashboard_usuario.ts.
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
