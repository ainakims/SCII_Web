import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function DashboardController(db: DB) {
  const { executeConnection } = db;

  const ObtenerTipoAtencion = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { anio } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",          Valor: "0" },
        { Nombre: "@FechaConsulta", Valor: anio },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Dashboard]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        message: error.message
      });
    }
  };

  const ObtenerProtocolos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { anio } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",          Valor: "1" },
        { Nombre: "@FechaConsulta", Valor: anio },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Dashboard]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        message: error.message
      });
    }
  };

  const ObtenerEspecialidad = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { anio } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",          Valor: "2" },
        { Nombre: "@FechaConsulta", Valor: anio },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Dashboard]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        message: error.message
      });
    }
  };

  return { ObtenerTipoAtencion, ObtenerProtocolos, ObtenerEspecialidad };
}