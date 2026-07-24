const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function PacientesController(db: DB) {
  const { executeConnection } = db;

  const ObtenerPacientes = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { esActivo } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",       Valor: "0" },
        { Nombre: "@Activo",  Valor: esActivo === false || esActivo === "0" ? "0" : "1" }
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Pacientes]";
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

  const ObtenerProveedor = async (req: Request, res: Response): Promise<Response> => {
    try {
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "1" }
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Pacientes]";
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

  const GenerarPaciente = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { Matricula, Proveedor, CURP, NSS, FechaNacimiento, Nombre, Sexo, TipoSanguineo, Alergias, EnfermedadesCronicas, TratamientosActuales, AlergiasMedicamentos, Cirugias, Fracturas, Riesgo } = req.body;
      
      const params: Parametros[] = [
        { Nombre: "@Case",                Valor: "0" },
        { Nombre: "@IdPaciente",          Valor: "" },
        { Nombre: "@Matricula",           Valor: String(Matricula ?? "0").trim() },
        { Nombre: "@Proveedor",           Valor: String(Proveedor ?? "").trim() },
        { Nombre: "@CURP",                Valor: String(CURP ?? "").trim() },
        { Nombre: "@NSS",                 Valor: String(NSS ?? "").trim() },
        { Nombre: "@Nombre",              Valor: String(Nombre ?? "").trim() },
        { Nombre: "@FechaNacimiento",     Valor: String(FechaNacimiento ?? "").trim() },
        { Nombre: "@Sexo",                Valor: String(Sexo ?? "").trim() },
        { Nombre: "@TipoSanguineo",       Valor: String(TipoSanguineo ?? "").trim() },
        { Nombre: "@Alergias",            Valor: String(Alergias ?? "").trim() },
        { Nombre: "@Enfermedades",        Valor: String(EnfermedadesCronicas ?? "").trim() },
        { Nombre: "@Tratamientos",        Valor: String(TratamientosActuales ?? "").trim() },
        { Nombre: "@AlergiasMedicamento", Valor: String(AlergiasMedicamentos ?? "").trim() },
        { Nombre: "@Cirugias",            Valor: String(Cirugias ?? "").trim() },
        { Nombre: "@Fracturas",           Valor: String(Fracturas ?? "").trim() },
        { Nombre: "@Riesgo",              Valor: String(Riesgo ?? "").trim() },
        { Nombre: "@Tipo",                Valor: String(Matricula ? Matricula == "0" ? "E" : "I" : "") },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
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

  const EdicionPaciente = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { Matricula, Proveedor, CURP, NSS, FechaNacimiento, Nombre, Sexo, TipoSanguineo, Alergias, EnfermedadesCronicas, TratamientosActuales, AlergiasMedicamentos, Cirugias, Fracturas, Riesgo } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",                Valor: "1" },
        { Nombre: "@IdPaciente",          Valor: String(id ?? "").trim() },
        { Nombre: "@Matricula",           Valor: String(Matricula ?? "0").trim() },
        { Nombre: "@Proveedor",           Valor: String(Proveedor ?? "").trim() },
        { Nombre: "@CURP",                Valor: String(CURP ?? "").trim() },
        { Nombre: "@NSS",                 Valor: String(NSS ?? "").trim() },
        { Nombre: "@Nombre",              Valor: String(Nombre ?? "").trim() },
        { Nombre: "@FechaNacimiento",     Valor: String(FechaNacimiento ?? "").trim() },
        { Nombre: "@Sexo",                Valor: String(Sexo ?? "").trim() },
        { Nombre: "@TipoSanguineo",       Valor: String(TipoSanguineo ?? "").trim() },
        { Nombre: "@Alergias",            Valor: String(Alergias ?? "").trim() },
        { Nombre: "@Enfermedades",        Valor: String(EnfermedadesCronicas ?? "").trim() },
        { Nombre: "@Tratamientos",        Valor: String(TratamientosActuales ?? "").trim() },
        { Nombre: "@AlergiasMedicamento", Valor: String(AlergiasMedicamentos ?? "").trim() },
        { Nombre: "@Cirugias",            Valor: String(Cirugias ?? "").trim() },
        { Nombre: "@Fracturas",           Valor: String(Fracturas ?? "").trim() },
        { Nombre: "@Riesgo",              Valor: String(Riesgo ?? "").trim() },
        { Nombre: "@Tipo",                Valor: "" },
      ];
      
      const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
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

  const EliminaPaciente = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Case",                Valor: "2" },
        { Nombre: "@IdPaciente",          Valor: id },
        { Nombre: "@Matricula",           Valor: "" },
        { Nombre: "@Proveedor",           Valor: "" },
        { Nombre: "@CURP",                Valor: "" },
        { Nombre: "@NSS",                 Valor: "" },
        { Nombre: "@Nombre",              Valor: "" },
        { Nombre: "@FechaNacimiento",     Valor: "" },
        { Nombre: "@Sexo",                Valor: "" },
        { Nombre: "@TipoSanguineo",       Valor: "" },
        { Nombre: "@Alergias",            Valor: "" },
        { Nombre: "@Enfermedades",        Valor: "" },
        { Nombre: "@Tratamientos",        Valor: "" },
        { Nombre: "@AlergiasMedicamento", Valor: "" },
        { Nombre: "@Cirugias",            Valor: "" },
        { Nombre: "@Fracturas",           Valor: "" },
        { Nombre: "@Riesgo",              Valor: "" },
        { Nombre: "@Tipo",                Valor: "" },
      ];
      
      const sql = "[TNGCORE].[dbo].[SCII_Control_Pacientes]";
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
  }

  const VerificarCURP = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { curp, idPaciente } = req.body;

      const params: Parametros[] = [
        { Nombre: "@CURP", Valor: String(curp ?? "").trim() },
      ];

      const sql = `SELECT IdPaciente FROM [TNGCORE].[dbo].[SCII_Pacientes] WHERE RTRIM(LTRIM(CURP)) = @CURP AND Estado = 'A'`;
      const result = await executeConnection<{ IdPaciente: number }>(sql, TipoConsulta.Consulta, params);

      if (result.length === 0) {
        return res.json({ ok: true, duplicado: false });
      }

      // Si todos los registros encontrados son del mismo paciente que se edita, no es duplicado
      const esMismoPaciente = idPaciente && result.every(r => r.IdPaciente === Number(idPaciente));
      if (esMismoPaciente) {
        return res.json({ ok: true, duplicado: false });
      }

      return res.json({ ok: true, duplicado: true });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: "Error interno", message: error.message });
    }
  };

  return { ObtenerPacientes, ObtenerProveedor, GenerarPaciente, EdicionPaciente, EliminaPaciente, VerificarCURP };
}