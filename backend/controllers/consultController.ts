const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
const aiService = require('../services/aiService');

export function consultController(db: DB) {
  const { executeConnection } = db;

  const analyzeWithAI = async (req: Request, res: Response): Promise<Response> => {
    try {
      const analysis = await aiService.analyzeConsult(req.body);

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
