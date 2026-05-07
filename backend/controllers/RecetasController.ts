import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function RecetasController(db: DB) {
  const { executeConnection } = db;

  const ObtenerRecetas = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Recetas]";

      const params: Parametros[] = [
        { Nombre: "@Case",       Valor: "0" },
        { Nombre: "@Matricula",  Valor: matricula },
        { Nombre: "@IdConsulta", Valor: "0" },
      ];

      const consultas = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      if (!consultas || consultas.length === 0) {
        return res.status(204).json({ message: "No se pudo encontrar recetas para el paciente." });
      }

      for (let i = 0; i < consultas.length; i++) {
        const idConsulta = consultas[i].ID;
        
        try {
          const params: Parametros[] = [
            { Nombre: "@Case",       Valor: "1" },
            { Nombre: "@Matricula",  Valor: matricula },
            { Nombre: "@IdConsulta", Valor: String(idConsulta) },
          ];

          const medicamentos = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
          consultas[i].Medicamentos = medicamentos || [];
        } catch {
          consultas[i].Medicamentos = [];
        }
      }

      return res.json(consultas);
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        message: error.message
      });
    }
  };

  return { ObtenerRecetas };
}