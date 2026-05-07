const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function ConfigController(db: DB) {
  const { executeConnection } = db;

  const ObtenerUsuarios = async (req: Request, res: Response): Promise<Response> => {
    try {
      const sql = `SELECT ID, Matricula, Usuario, Nombre, Categoria_desc, Especialidad, Cedula, Id_Rol, Rol, Email, Activo, FechaCreacion
		               FROM [TNGCORE].[dbo].[SCII_Usuarios]
		               LEFT JOIN [TNG].[dbo].[Empleados] ON Empl_matricula COLLATE Modern_Spanish_CI_AS = Matricula
		               LEFT JOIN [TNG].[dbo].[Categorias] ON Empl_clave_categoria = Categoria_codigo
                   WHERE Matricula != ''
		               ORDER BY Activo DESC, Id_Rol, Matricula DESC, Nombre`;
      const result = await executeConnection<boolean>(sql, TipoConsulta.Consulta, []);

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

  const ObtenerCuentaAD = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;

      const params: Parametros[] = [
        { Nombre: "@MatriculaUsuario", Valor: matricula },
        { Nombre: "@UnidadNegocio",    Valor: 'TNG' },
      ];
      
      const result = await executeConnection<Boolean>("[TNGCORE].[dbo].[WSP_Consumibles_ConsultarMatriculaAD]", TipoConsulta.ProcedimientoAlmacenado, params);

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

  const BuscarIdUsuario = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Matricula", Valor: matricula },
      ];

      const sql = `SELECT CONCAT(TRIM(Empl_Nombres), ' ', TRIM(Empl_Apellidos)) Empl_Nombres, Categoria_desc, Empl_status
                   FROM [TNG].[dbo].[Empleados]
                   INNER JOIN [TNG].[dbo].[Categorias] ON Empl_clave_categoria = Categoria_codigo
                   WHERE Empl_matricula=@Matricula`;

      const result = await executeConnection<boolean>(sql, TipoConsulta.Consulta, params);

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

  const GenerarUsuarios = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { Matricula, FotoUrl, Usuario, Correo, Nombre, Especialidad, Cedula, Id_Rol, Rol } = req.body;

      const params: Parametros[] = [
        { Nombre: "@Matricula",    Valor: Matricula },
        { Nombre: "@Usuario",      Valor: Usuario },
        { Nombre: "@Nombre",       Valor: Nombre },
        { Nombre: "@Especialidad", Valor: Especialidad },
        { Nombre: "@Cedula",       Valor: Cedula },
        { Nombre: "@IdRol",        Valor: Id_Rol },
        { Nombre: "@Rol",          Valor: Rol },
        { Nombre: "@Correo",       Valor: Correo },
      ];
      
      if (!Usuario || !Correo) {
        return res.status(400).json({
          message: "Se requiere un usuario y correo para dar de alta al usuario.",
        });
      }

      const sql =`INSERT INTO [TNGCORE].[dbo].[SCII_Usuarios]
                  ([Matricula],[Usuario],[Password],[Nombre],[Especialidad],[Cedula],[Id_Rol],[Rol],[Email],[Activo],[FechaCreacion])
                  VALUES (@Matricula,@Usuario,'',@Nombre,@Especialidad,@Cedula,@IdRol,@Rol,@Correo,'1',GETDATE())`
      
      const result = await executeConnection<boolean>(sql, TipoConsulta.Consulta, params);

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

  const EdicionUsuarios = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { ID, Usuario, Correo, Nombre, Especialidad, Cedula, Id_Rol, Rol } = req.body;

      const params: Parametros[] = [
        { Nombre: "@IdUsuario",    Valor: ID },
        { Nombre: "@Usuario",      Valor: Usuario },
        { Nombre: "@Correo",       Valor: Correo },
        { Nombre: "@Especialidad", Valor: Especialidad },
        { Nombre: "@Cedula",       Valor: Cedula },
        { Nombre: "@IdRol",        Valor: Id_Rol },
        { Nombre: "@Rol",          Valor: Rol },
      ];

      const sql =`UPDATE [TNGCORE].[dbo].[SCII_Usuarios]
                  SET Usuario=@Usuario, Especialidad=@Especialidad, Cedula=@Cedula, Id_Rol=@IdRol, Rol=@Rol, Email=@Correo
                  WHERE ID=@IdUsuario`;
      
      const result = await executeConnection<boolean>(sql, TipoConsulta.Consulta, params);

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

  const ModificaUsuario = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { ID, estado } = req.body;

      const params: Parametros[] = [
        { Nombre: "@IdUsuario", Valor: ID },
        { Nombre: "@Estado",    Valor: estado },
      ];

      const sql =`UPDATE [TNGCORE].[dbo].[SCII_Usuarios]
                  SET Activo=@Estado
                  WHERE ID=@IdUsuario`

      const result = await executeConnection<boolean>(sql, TipoConsulta.Consulta, params);

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

  const VerificarMatricula = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      const params: Parametros[] = [{ Nombre: "@Matricula", Valor: String(matricula ?? "") }];
      const result = await executeConnection<{ ID: number }>(
        "SELECT ID FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Matricula = @Matricula",
        TipoConsulta.Consulta,
        params
      );
      return res.json({ duplicada: result.length > 0 });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: "Error interno", message: error.message });
    }
  };

  return { ObtenerUsuarios, ObtenerCuentaAD, BuscarIdUsuario, GenerarUsuarios, EdicionUsuarios, ModificaUsuario, VerificarMatricula };
}