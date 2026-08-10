const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function ConsultasController(db: DB) {
  const { executeConnection } = db;

  const BuscarMatricula = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Matricula", Valor: matricula },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Buscar_Matricula]";
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

  const BuscarProveedor = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { curp } = req.body;
      const params: Parametros[] = [
        { Nombre: "@CURP", Valor: curp },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Buscar_Proveedor]";
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

  const ObtenerAlergias = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idPaciente, matricula } = req.body;
      const idPac = idPaciente ? String(idPaciente) : "0";
      const mat = matricula ? String(matricula).trim() : "";

      const sql = `
        SELECT TOP 1 Alergias, AlergiasMedicamento
        FROM [TNGCORE].[dbo].[SCII_Pacientes]
        WHERE Estado = 'A' AND (
          (NULLIF(@IdPaciente, '0') IS NOT NULL AND IdPaciente = @IdPaciente)
          OR (NULLIF(@Matricula, '') IS NOT NULL AND RTRIM(LTRIM(Matricula)) = @Matricula)
        )`;
      const params: Parametros[] = [
        { Nombre: "@IdPaciente", Valor: idPac },
        { Nombre: "@Matricula",  Valor: mat },
      ];

      const result = await executeConnection<any>(sql, TipoConsulta.Consulta, params);

      return res.json({
        ok: true,
        data: result?.[0] ?? null
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

  const BuscarMedicionEquipo = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idUsuario, matriculaCurp } = req.body;
      const idUser = idUsuario ? String(idUsuario) : "0";
      const matCurp = matriculaCurp ? String(matriculaCurp).trim() : "";

      const sql = `
        SELECT TOP 1 *
        FROM [TNGCORE].[dbo].[SCII_Mediciones_Equipo]
        WHERE Id_Usuario = @IdUsuario
          AND RTRIM(LTRIM(Matricula_Curp)) = @MatriculaCurp
          AND Tipo_Registro = 1
          AND RegistroLigado = 0
        ORDER BY Fecha_medicion DESC`;
      const params: Parametros[] = [
        { Nombre: "@IdUsuario",     Valor: idUser },
        { Nombre: "@MatriculaCurp", Valor: matCurp },
      ];

      const result = await executeConnection<any>(sql, TipoConsulta.Consulta, params);

      return res.json({
        ok: true,
        data: result?.[0] ?? null
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

  const BuscarHistorial = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idEmpleado } = req.body;

      console.log("matricula: " + idEmpleado);

      const params: Parametros[] = [
        { Nombre: "@Case", Valor: "0" },
        { Nombre: "@IdEmpleado", Valor: idEmpleado },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Buscar_Historial_Receta]";
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

  const BuscarRecetaMed = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idEmpleado } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case", Valor: "1" },
        { Nombre: "@IdEmpleado", Valor: idEmpleado },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Buscar_Historial_Receta]";
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

  const AgregarConsulta = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { expediente } = req.body;
      const sql = "[TNGCORE].[dbo].[SCII_Agregar_Consulta]";

      const params = [
        { Nombre: "@IdMedico",      Valor: String(expediente.MedicoID ?? 0) },
        { Nombre: "@IdPaciente",    Valor: String(expediente.PacienteID ?? 0) },
        { Nombre: "@IdAgenda",      Valor: expediente.IdAgenda?.trim() ?? "" },
        { Nombre: "@Matricula",     Valor: String(expediente.Matricula ?? "") },
        { Nombre: "@TipoPaciente",  Valor: expediente.TipoPaciente?.trim() ?? "" },
        { Nombre: "@TipoAtencion",  Valor: expediente.TipoAtencion?.trim() ?? "" },
        { Nombre: "@Enfermedad",    Valor: expediente.TipoEnfermedad?.trim() ?? "" },
        { Nombre: "@Protocolo",     Valor: String(parseInt(expediente.ProtocoloAtencion) || 0) },
        { Nombre: "@Padecimiento",  Valor: expediente.PadecimientoActual?.trim() ?? "" },
        { Nombre: "@Peso",          Valor: String(parseFloat(expediente.ExploracionFisica?.Peso) || 0) },
        { Nombre: "@Talla",         Valor: String(parseFloat(expediente.ExploracionFisica?.Talla) || 0) },
        { Nombre: "@Abdomen",       Valor: String(parseFloat(expediente.ExploracionFisica?.Abdomen) || 0) },
        { Nombre: "@IMC",           Valor: String(parseFloat(expediente.ExploracionFisica?.IMC) || 0) },
        { Nombre: "@SpO2",          Valor: String(parseFloat(expediente.ExploracionFisica?.SpO2) || 0) },
        { Nombre: "@PA",            Valor: expediente.ExploracionFisica?.PA ?? "" },
        { Nombre: "@TA",            Valor: expediente.ExploracionFisica?.TA ?? "" },
        { Nombre: "@FC",            Valor: expediente.ExploracionFisica?.FC ?? "" },
        { Nombre: "@FR",            Valor: expediente.ExploracionFisica?.FR ?? "" },
        { Nombre: "@Diagnostico",   Valor: expediente.Diagnostico?.trim() ?? "" },
        { Nombre: "@Recomendacion", Valor: expediente.Recomendaciones?.trim() ?? "" },
      ];
      
      const paramsCon: Parametros[] = [
        { Nombre: "@Case",          Valor: "0" },
        ...params,
        { Nombre: "@ConsultaID",    Valor: "0" },
        { Nombre: "@Farmaco",       Valor: "" },
        { Nombre: "@Dosis",         Valor: "" },
        { Nombre: "@Frecuencia",    Valor: "0" },
        { Nombre: "@Duracion",      Valor: "0" },
      ];

      const result = await executeConnection<{ ID: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsCon);

      if (!result || result.length === 0) {
        throw new Error("Ocurrió un error al guardar la consulta.");
      }

      const consultaId = result[0].ID;
      const receta = (expediente.RecetaEstructurada || []).filter((m: any) => m?.medicamento && m.medicamento.trim() !== "");
      let inserted = 0;

      if (receta.length > 0) {
        for (const med of receta) {
          const paramsRec: Parametros[] = [
            { Nombre: "@Case",       Valor: "1" },
            ...params,
            { Nombre: "@ConsultaID", Valor: String(consultaId) },
            { Nombre: "@Farmaco",    Valor: med.medicamento.trim() },
            { Nombre: "@Dosis",      Valor: med.dosis?.trim() ?? "" },
            { Nombre: "@Frecuencia", Valor: String(parseInt(med.frecuencia) || 0) },
            { Nombre: "@Duracion",   Valor: String(parseInt(med.duracion) || 0) },
          ];

          await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsRec);
          inserted++;
        }
      }

      if (receta.length > 0) {
        if (inserted > 0) {
          return res.json({
            ok: true,
            consultaId,
            inserted
          });
        } else {
          return res.status(400).json({
            ok: false,
            message: "Se guardó la consulta sin recetar medicamento."
          });
        }
      }

      return res.json({
        ok: true,
        consultaId
      });
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        message: error.message
      });
    }
  };

  return { BuscarMatricula, BuscarProveedor, BuscarHistorial, BuscarRecetaMed, AgregarConsulta, ObtenerAlergias, BuscarMedicionEquipo };
}