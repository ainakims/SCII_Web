const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";

export function PerfilController(db: DB) {
  const { executeConnection } = db;

  const UsuarioSesion = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idUsuario, matricula, usuario } = req.body;

      const params: Parametros[] = [
        { Nombre: "@IdUsuario", Valor: idUsuario },
        { Nombre: "@Matricula", Valor: matricula },
        { Nombre: "@Usuario",   Valor: usuario },
      ];

      //   const sql = `SELECT Matricula, CURP, NSS, Nombres, FechaNacimiento, Sexo, TipoSanguineo
      //                FROM [TNGCORE].[dbo].[SCII_Pacientes]
      //                WHERE Matricula=@Matricula`;

      const sql = `SELECT TOP 1
                   IdExploracion, usu.ID,
                   COALESCE(emp.Empl_matricula COLLATE Modern_Spanish_CI_AS, usu.Matricula) Matricula, 
                   COALESCE(usu.Nombre COLLATE Modern_Spanish_CI_AS, CONCAT(TRIM(emp.Empl_Nombres) COLLATE Modern_Spanish_CI_AS, ' ', TRIM(emp.Empl_Apellidos))) AS Nombres,
                   CURP, NSS, pac.FechaNacimiento, Sexo, TipoSanguineo,
                   Alergias, Enfermedades, Tratamientos, AlergiasMedicamento, FechaEvaluacion, Contacto, NumContacto,
                   SignosVitales, Cabeza, Oidos, Ojos, AgudezaVisual, Boca, Nariz, Cuello, AreaPrecordial, MiembrosToracicos,
                   MiembrosPelvicos, Abdomen, Genitales, PielAnexos, ColumnaCervicalDorsal, ColumnaLumbar    
                   FROM [10.133.8.77].[TNGCORE].[dbo].Empleados emp
                   FULL OUTER JOIN TNGCORE.dbo.SCII_Usuarios usu ON usu.Matricula = Empl_matricula COLLATE Modern_Spanish_CI_AS
                   LEFT JOIN TNGCORE.dbo.SCII_Pacientes pac ON pac.Matricula = Empl_matricula COLLATE Modern_Spanish_CI_AS
                   LEFT JOIN TNGCORE.dbo.SCII_EvaluacionMedica eva ON eva.PacienteId = pac.IdPaciente
                   LEFT JOIN TNGCORE.dbo.SCII_Evaluacion_Ficha fic ON fic.IdFicha = eva.Ficha
                   LEFT JOIN TNGCORE.dbo.SCII_Evaluacion_Exploracion exp ON exp.IdExploracion = eva.Exploracion
                   WHERE
                   (
                       @IdUsuario IS NOT NULL 
                       AND usu.ID = @IdUsuario
                       AND usu.Usuario = @Usuario
                   )
                   OR
                   (
                       (@IdUsuario IS NULL OR @IdUsuario = '')
                       AND NULLIF(@Matricula, '') IS NOT NULL
                       AND emp.Empl_matricula = @Matricula
                   )
                   ORDER BY IdExploracion DESC`;

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

//   const GetEvaluacion = async (req: Request, res: Response): Promise<Response> => {
//     try {

//     } catch (error: any) {
//       return res.status(500).json({
//         ok: false,
//         error: "Error interno",
//         message: error.message,
//         stack: error.stack
//       });
//     }
//   };

  return { UsuarioSesion, /*GetEvaluacion*/ };
}