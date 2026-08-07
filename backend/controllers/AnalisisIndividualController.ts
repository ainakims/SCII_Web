import { Request, Response } from "express";
import { evaluarSaludConAnalisisIA } from "../services/analisisIndividualIA.service";

export function AnalisisIndividualController() {
  // Genera el análisis individual con IA de un usuario (matrícula). `esUsuarioMedico`
  // se decide aquí a partir del rol del JWT ya validado (ValidarToken puso
  // req.user) — nunca se confía en un valor que mande el cliente, porque
  // controla si el servicio regresa contenido clínico sensible (Nivel D:
  // diagnóstico diferencial, aptitud laboral detallada).
  const Evaluar = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      if (!matricula) {
        return res.status(400).json({ ok: false, message: "Se requiere la matrícula del usuario." });
      }

      const rol = (req as any).user?.rol;
      const esUsuarioMedico = String(rol ?? "").toLowerCase().trim() === "médico";

      const data = await evaluarSaludConAnalisisIA(String(matricula), esUsuarioMedico);

      return res.json({ ok: true, data });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
      });
    }
  };

  return { Evaluar };
}
