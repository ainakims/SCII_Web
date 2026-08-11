import { Request, Response } from "express";
import { evaluarSaludConAnalisisIA } from "../services/analisisIndividualIA.service";

export function AnalisisIndividualController() {
  const Evaluar = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;

      if (!matricula) {
        return res.status(400).json({ ok: false, message: "Se requiere la matrícula del usuario." });
      }

      const rol = (req as any).user?.rol;
      const esUsuarioMedico = String(rol ?? "").toLowerCase().trim() === "médico";

      const data = await evaluarSaludConAnalisisIA(String(matricula), esUsuarioMedico, true);

      return res.json({ ok: true, data });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
      });
    }
  };

  const EvaluarInactivos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;

      if (!matricula) {
        return res.status(400).json({ ok: false, message: "Se requiere la matrícula del usuario." });
      }

      const rol = (req as any).user?.rol;
      const esUsuarioMedico = String(rol ?? "").toLowerCase().trim() === "médico";

      const data = await evaluarSaludConAnalisisIA(String(matricula), esUsuarioMedico, false);

      return res.json({ ok: true, data });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
      });
    }
  };

  return { Evaluar, EvaluarInactivos };
}
