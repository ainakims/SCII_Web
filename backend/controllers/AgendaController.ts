const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function AgendaController(db: DB) {
  const { executeConnection } = db;

  const ObtenerCitas = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula, inicio, final } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "0" },
        { Nombre: "@Matricula", Valor: matricula },
        { Nombre: "@Inicio",    Valor: inicio },
        { Nombre: "@Final",     Valor: final },
        { Nombre: "@IdAgenda",  Valor: null },
        { Nombre: "@Estado",    Valor: '' },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
    
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  const AgregarCitas = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { agenda } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "0" },
        { Nombre: "@Id",        Valor: agenda.id },
        { Nombre: "@Matricula", Valor: agenda.matricula },
        { Nombre: "@Motivo",    Valor: agenda.motivo },
        { Nombre: "@Dia",       Valor: agenda.dia },
        { Nombre: "@Hora",      Valor: agenda.hora },
        { Nombre: "@Periodo",   Valor: agenda.periodo },
        { Nombre: "@Fecha",     Valor: agenda.fecha },
        { Nombre: "@Duracion",  Valor: agenda.duracion },
        { Nombre: "@Notas",     Valor: agenda.notas },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda]";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
    
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  const EdicionCitas = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { agenda } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",     Valor: "1" },
        { Nombre: "@Id",       Valor: agenda.idAgenda },
        { Nombre: "@Motivo",   Valor: agenda.motivo },
        { Nombre: "@Dia",      Valor: agenda.dia },
        { Nombre: "@Hora",     Valor: agenda.hora },
        { Nombre: "@Periodo",  Valor: agenda.periodo },
        { Nombre: "@Fecha",    Valor: agenda.fecha },
        { Nombre: "@Duracion", Valor: agenda.duracion },
        { Nombre: "@Notas",    Valor: agenda.notas },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda]";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
    
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  const ConfirmaCita = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idAgenda, esActivo, consultaId } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",       Valor: "1" },
        { Nombre: "@Inicio",     Valor: "" },
        { Nombre: "@Final",      Valor: "" },
        { Nombre: "@IdAgenda",   Valor: idAgenda },
        { Nombre: "@IdConsulta", Valor: consultaId },
        { Nombre: "@Estado",     Valor: esActivo },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
    
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  const EliminaCitas = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idAgenda } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",     Valor: "2" },
        { Nombre: "@Inicio",   Valor: "" },
        { Nombre: "@Final",    Valor: "" },
        { Nombre: "@IdAgenda", Valor: idAgenda },
        { Nombre: "@Estado", Valor: '' },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda]";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
    
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  return { ObtenerCitas, AgregarCitas, EdicionCitas, ConfirmaCita, EliminaCitas };
}