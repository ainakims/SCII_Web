import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
import { RawIndicadorRow } from "../interfaces/salud_poblacional";
import { normalizarPoblacion } from "../services/poblacionValidacion.service";
import { generarResumenMedicoIA } from "../services/iaResumenPoblacional.service";

export function SaludPoblacionalController(db: DB) {
  const { executeConnection } = db;

  // Regresa el historial completo de evaluaciones ya normalizado/validado
  // (capas RawData -> NormalizedData -> ValidatedData, sección 39 del documento).
  // El filtrado y la agregación estadística se hacen en el frontend, igual que
  // en el resto del sistema (ver Indicadores.tsx).
  const ObtenerDatos = async (req: Request, res: Response): Promise<Response> => {
    try {      
      const params: Parametros[] = [
        { Nombre: "@Activo", Valor: "1" }        
      ];

      // TODO: ajustar el nombre del SP y sus parámetros cuando se confirme el
      // contrato real. "SCII_Valores_Indicadores" es el nombre de referencia
      // acordado con el usuario mientras tanto.
      const sql = "[TNGCORE].[dbo].[SCII_Valores_Indicadores]";

      const filas = await executeConnection<RawIndicadorRow>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      const data = normalizarPoblacion(Array.isArray(filas) ? filas : []);

      return res.json({
        ok: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      });
    }
  };

  const ResumenIA = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { agregados } = req.body;

      if (!agregados || typeof agregados !== "object") {
        return res.status(400).json({ ok: false, message: "Se requiere el payload de agregados." });
      }

      const { resumenGeneral, departamentos, modelo } = await generarResumenMedicoIA(agregados);

      return res.json({ ok: true, resumenGeneral, departamentos, modelo });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
      });
    }
  };

  return { ObtenerDatos, ResumenIA };
}
