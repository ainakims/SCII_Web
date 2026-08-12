const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
const aiService = require('../services/aiService');

export function consultController(db: DB) {
  const { executeConnection } = db;

  const analyzeWithAI = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula, pacienteId, ...consultData } = req.body;

      const idPaciente = pacienteId ? String(pacienteId) : "0";
      const mat = matricula ? String(matricula).trim() : "";

      let paciente: any = null;
      let historial: any[] = [];

      // Antecedentes del paciente (edad, enfermedades, tratamientos, alergias) y su
      // historial de consultas previas solo se consultan si el paciente está identificado.
      // Cualquier falla aquí no debe impedir el análisis clínico base.
      if (idPaciente !== "0" || mat) {
        try {
          const sqlPaciente = `
            SELECT TOP 1 FechaNacimiento, Sexo, CURP, Alergias, Enfermedades, Tratamientos, AlergiasMedicamento
            FROM [TNGCORE].[dbo].[SCII_Pacientes]
            WHERE Estado = 'A' AND (
              (NULLIF(@IdPaciente, '0') IS NOT NULL AND IdPaciente = @IdPaciente)
              OR (NULLIF(@Matricula, '') IS NOT NULL AND RTRIM(LTRIM(Matricula)) = @Matricula)
            )`;
          const paramsPaciente: Parametros[] = [
            { Nombre: "@IdPaciente", Valor: idPaciente },
            { Nombre: "@Matricula",  Valor: mat },
          ];

          const resultPaciente = await executeConnection<any>(sqlPaciente, TipoConsulta.Consulta, paramsPaciente);
          paciente = resultPaciente?.[0] ?? null;
        } catch {
          paciente = null;
        }

        try {
          const sqlHistorial = "[TNGCORE].[dbo].[SCII_Buscar_Historial_Receta]";
          const paramsHistorial: Parametros[] = [
            { Nombre: "@Case", Valor: "0" },
            { Nombre: "@IdEmpleado", Valor: idPaciente !== "0" ? idPaciente : mat },
          ];

          historial = await executeConnection<any>(sqlHistorial, TipoConsulta.ProcedimientoAlmacenado, paramsHistorial) ?? [];
        } catch {
          historial = [];
        }
      }

      const analysis = await aiService.analyzeConsult({
        ...consultData,
        Paciente: paciente,
        HistorialConsultas: historial,
      });

      return res.json({
        ok: true,
        data: analysis
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
  
  return { analyzeWithAI };
};


// exports.searchRecipes = async (req, res) => {
//     try {
//         const q = req.query.q || '';
//         if (!q) {
//             return res.json([]);
//         }

//         const safeQ = q.replace(/'/g, "''");

//         const searchQuery = `
//             SELECT c.ID AS ConsultaID, c.Folio, c.FechaHora, c.MedicoID,
//                    p.ID AS PacienteID, p.Nombres, p.Apellidos, p.CURP, p.Sexo, p.FechaNacimiento, p.AlergiasMedicamentos, p.Alergias,
//                    r.ID AS RecetaID
//             FROM (Consultas c
//             INNER JOIN Pacientes p ON c.PacienteID = p.ID)
//             INNER JOIN Recetas r ON c.ID = r.ConsultaID
//             WHERE c.Folio LIKE '%${safeQ}%' 
//                OR p.Nombres LIKE '%${safeQ}%' 
//                OR p.Apellidos LIKE '%${safeQ}%' 
//                OR p.CURP LIKE '%${safeQ}%'
//             ORDER BY c.FechaHora DESC
//         `;

//         const result = await db.query(searchQuery);

//         if (result && result.length > 0) {
//             for (let i = 0; i < result.length; i++) {
//                 const recetaId = result[i].RecetaID;
//                 const detallesQuery = `SELECT * FROM RecetaDetalles WHERE RecetaID = ${recetaId}`;
//                 try {
//                     const detalles = await db.query(detallesQuery);
//                     result[i].Medicamentos = detalles || [];
//                 } catch (e) {
//                     console.error("Failed to fetch recetadetalles: ", recetaId, e);
//                     result[i].Medicamentos = [];
//                 }
//             }
//         }

//         res.json(result || []);
//     } catch (error) {
//         console.error("Error searching recipes:", error);
//         res.status(500).json({ error: error.message });
//     }
// };
