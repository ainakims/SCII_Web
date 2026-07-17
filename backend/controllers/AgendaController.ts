const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function AgendaController(db: DB) {
  const { executeConnection, safeExecute } = db;

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

      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda_Test]";
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

      // @Hora llega como decimal 24h (ej. 14.5 = 2:30 PM)
      // El SP espera la hora en formato 12h + @Periodo + @Minutos por separado
      const horaDecimal = parseFloat(agenda.hora);
      const horaEntera  = Math.floor(horaDecimal);
      const minutosCalc = Math.round((horaDecimal - horaEntera) * 60);
      // Convertir a 12h: 0→12, 13-23→1-11, resto sin cambio
      const hora12 = horaEntera === 0 ? 12 : horaEntera > 12 ? horaEntera - 12 : horaEntera;

      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "0" },
        { Nombre: "@Id",        Valor: agenda.id },
        { Nombre: "@Matricula", Valor: agenda.matricula },
        { Nombre: "@Motivo",    Valor: agenda.motivo },
        { Nombre: "@Dia",       Valor: agenda.dia },
        { Nombre: "@Hora",      Valor: String(hora12) },
        { Nombre: "@Minutos",   Valor: String(minutosCalc) },
        { Nombre: "@Periodo",   Valor: agenda.periodo },
        { Nombre: "@Fecha",     Valor: agenda.fecha },
        { Nombre: "@Duracion",  Valor: agenda.duracion },
        { Nombre: "@Notas",     Valor: agenda.notas },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda_Test]";
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

      const horaDecimal2 = parseFloat(agenda.hora);
      const horaEntera2  = Math.floor(horaDecimal2);
      const minutosCalc2 = Math.round((horaDecimal2 - horaEntera2) * 60);
      const hora12b = horaEntera2 === 0 ? 12 : horaEntera2 > 12 ? horaEntera2 - 12 : horaEntera2;

      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "1" },
        { Nombre: "@Id",        Valor: agenda.idAgenda },
        { Nombre: "@Matricula", Valor: agenda.matricula ?? "" },
        { Nombre: "@Motivo",    Valor: agenda.motivo },
        { Nombre: "@Dia",       Valor: agenda.dia },
        { Nombre: "@Hora",      Valor: String(hora12b) },
        { Nombre: "@Minutos",   Valor: String(minutosCalc2) },
        { Nombre: "@Periodo",   Valor: agenda.periodo },
        { Nombre: "@Fecha",     Valor: agenda.fecha },
        { Nombre: "@Duracion",  Valor: agenda.duracion },
        { Nombre: "@Notas",     Valor: agenda.notas },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Registro_Agenda_Test]";
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
        { Nombre: "@IdConsulta", Valor: consultaId || '' },
        { Nombre: "@Estado",     Valor: esActivo },
      ];
      
      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda_Test]";
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

      const sql = "[TNGCORE].[dbo].[SCII_Control_Agenda_Test]";
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

  const ObtenerFestivos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const sql = "SELECT HolDate, Description FROM [10.133.8.77].[TASTD].[dbo].[CatHolidays]";
      const result = await safeExecute(sql);

      const festivos = result.map((row: any) => {
        const fecha = new Date(row.HolDate);
        return {
          dia:    fecha.getUTCDate(),
          mes:    fecha.getUTCMonth() + 1,
          anio:   fecha.getUTCFullYear(),
          nombre: String(row.Description ?? "").trim(),
        };
      });

      return res.json({ ok: true, data: festivos });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  return { ObtenerCitas, AgregarCitas, EdicionCitas, ConfirmaCita, EliminaCitas, ObtenerFestivos };
}