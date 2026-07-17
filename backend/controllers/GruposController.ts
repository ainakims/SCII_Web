import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function GruposController(db: DB) {
  const { executeConnection } = db;

  const ObtenerGrupos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { medico } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",     Valor: "0" },
        { Nombre: "@Medico",   Valor: String(medico ?? "") },
        { Nombre: "@Nombre",   Valor: "" },
        { Nombre: "@Pacientes",Valor: "" },
        { Nombre: "@ID",       Valor: "0" },
      ];
      const sql = "[TNGCORE].[dbo].[SCII_Control_Grupos_Agenda]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      return res.json({ ok: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };

  const GuardarGrupo = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { medico, nombre, pacientes } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "1" },
        { Nombre: "@Medico",    Valor: String(medico ?? "") },
        { Nombre: "@Nombre",    Valor: String(nombre ?? "") },
        { Nombre: "@Pacientes", Valor: JSON.stringify(pacientes ?? []) },
        { Nombre: "@ID",        Valor: "0" },
      ];
      const sql = "[TNGCORE].[dbo].[SCII_Control_Grupos_Agenda]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      return res.json({ ok: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };

  const EliminarGrupo = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "2" },
        { Nombre: "@Medico",    Valor: "" },
        { Nombre: "@Nombre",    Valor: "" },
        { Nombre: "@Pacientes", Valor: "" },
        { Nombre: "@ID",        Valor: String(id ?? 0) },
      ];
      const sql = "[TNGCORE].[dbo].[SCII_Control_Grupos_Agenda]";
      await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };

  return { ObtenerGrupos, GuardarGrupo, EliminarGrupo };
}
