import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
import { RawIndicadorRow, RegistroValidado } from "../interfaces/salud_poblacional";
import { normalizarPoblacion, validarFecha } from "../services/poblacionValidacion.service";
import { ConsultaPropia } from "../interfaces/dashboard_usuario";

// Filas devueltas por los SELECT directos de este controlador — mismas
// columnas que @Case=1 y @Case=3 de SCII_Valores_Indicadores, pero filtradas
// en SQL por matrícula (WHERE, no fetch-de-toda-la-población + filter en
// Node) y sin los JOIN de catálogo de empleado que ese SP hace para
// Departamento/Categoria/Especialidad, que este dashboard no necesita.
interface FilaIndicadorPropio {
  Id: number;
  Matricula: string;
  Sistolica: number | null;
  Diastolica: number | null;
  Glucosa: string | null;
  Colesterol: string | null;
  Trigliceridos: string | null;
  Peso: number | null;
  Altura: number | null;
  PA: string | null;
  IMC: number | null;
  ICT: number | null;
  Riesgo: number | null;
  Fecha: string | null;
}

interface FilaConsultaPropia {
  TipoAtencion: string | null;
  TipoProtocolo: string | null;
  IMC: number | null;
  PesoenKg: number | null;
  PresionArterial: string | null;
  FrecuenciaCardiaca: string | null;
  FechaConsulta: string | null;
}

// "120/80" -> { sistolica: 120, diastolica: 80 }. Mismo formato de columna PA
// que usa SCII_Consultas (ver @Case=3 del SP SCII_Valores_Indicadores).
function parsearPresionArterial(pa: string | null): { sistolica: number | null; diastolica: number | null } {
  if (!pa) return { sistolica: null, diastolica: null };
  const partes = pa.split("/");
  if (partes.length !== 2) return { sistolica: null, diastolica: null };
  const sistolica = Number(partes[0].trim());
  const diastolica = Number(partes[1].trim());
  return {
    sistolica: Number.isFinite(sistolica) ? sistolica : null,
    diastolica: Number.isFinite(diastolica) ? diastolica : null,
  };
}

function coerceNumero(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const numerico = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numerico) ? numerico : null;
}

export function DashboardUsuarioController(db: DB) {
  const { executeConnection } = db;

  // Resumen de salud del propio usuario en sesión (Dashboard > Usuario):
  // indicadores (SCII_Indicadores) + consultas (SCII_Consultas) de una sola
  // matrícula, vía SELECT directo parametrizado — no pasa por el análisis de
  // IA (AnalisisIndividual/Evaluar) ni por el SP poblacional con @Case.
  //
  // La matrícula se toma del JWT (req.user), nunca del body: este endpoint
  // es de autoconsulta, y confiar en una matrícula enviada por el cliente
  // permitiría a cualquier "Usuario" pedir el historial clínico de otro
  // empleado con solo cambiar el payload de la petición.
  const ObtenerResumenPropio = async (req: Request, res: Response): Promise<Response> => {
    try {
      const matricula = (req as any).user?.matricula;
      const clave = String(matricula ?? "").trim().toUpperCase();

      if (!clave) {
        return res.status(400).json({ ok: false, message: "No se encontró la matrícula del usuario en la sesión." });
      }

      const params: Parametros[] = [{ Nombre: "@Matricula", Valor: clave }];

      const [filasIndicadores, filasConsultas] = await Promise.all([
        executeConnection<FilaIndicadorPropio>(
          `SELECT Id, Matricula, Sistolica, Diastolica, Glucosa, Colesterol, Trigliceridos,
                  Peso, Altura, PA, IMC, ICT, Riesgo, Fecha
           FROM [TNGCORE].[dbo].[SCII_Indicadores]
           WHERE RTRIM(LTRIM(Matricula)) = @Matricula
           ORDER BY Fecha ASC`,
          TipoConsulta.Consulta,
          params
        ),
        executeConnection<FilaConsultaPropia>(
          `SELECT
             CASE
               WHEN C.TipoAtencion = 'AUX' THEN 'Atencion auxiliar'
               WHEN C.TipoAtencion = 'EFG' THEN 'Examen fisico auxiliar'
               ELSE 'NO DETERMINADO'
             END TipoAtencion,
             (SELECT PO.Nombre FROM [TNGCORE].[dbo].[SCII_Protocolo] PO WHERE PO.IdProtocolo = C.Protocolo) TipoProtocolo,
             C.imc IMC,
             C.Peso PesoenKg,
             C.PA PresionArterial,
             C.FC FrecuenciaCardiaca,
             C.FechaConsulta
           FROM [10.133.8.77].[TNGCORE].[dbo].[Empleados] E
           INNER JOIN [TNGCORE].[dbo].[SCII_Pacientes] P ON P.Matricula COLLATE Modern_Spanish_CI_AS = E.Empl_matricula
           INNER JOIN [TNGCORE].[dbo].[SCII_Consultas] C ON C.PacienteID = P.IdPaciente
           WHERE RTRIM(LTRIM(E.Empl_matricula)) = @Matricula
           ORDER BY C.FechaConsulta ASC`,
          TipoConsulta.Consulta,
          params
        ),
      ]);

      const registros: RegistroValidado[] = normalizarPoblacion(
        (Array.isArray(filasIndicadores) ? filasIndicadores : []).map<RawIndicadorRow>((f) => ({
          Id: f.Id,
          Matricula: f.Matricula,
          Sistolica: f.Sistolica,
          Diastolica: f.Diastolica,
          Glucosa: f.Glucosa,
          Colesterol: f.Colesterol,
          Trigliceridos: f.Trigliceridos,
          Peso: f.Peso,
          Altura: f.Altura,
          PA: f.PA,
          IMC: f.IMC,
          ICT: f.ICT,
          Riesgo: f.Riesgo,
          Fecha: f.Fecha,
          FechaNacimiento: null,
          Categoria_desc: null,
          Departamento: null,
          Depto_Series: null,
          Especialidad: null,
          Sexo: null,
        }))
      );

      const consultas: ConsultaPropia[] = (Array.isArray(filasConsultas) ? filasConsultas : []).map((f) => {
        const presion = parsearPresionArterial(f.PresionArterial);
        return {
          FechaConsulta: validarFecha(f.FechaConsulta, { noFutura: true }),
          TipoAtencion: f.TipoAtencion,
          TipoProtocolo: f.TipoProtocolo,
          Sistolica: presion.sistolica,
          Diastolica: presion.diastolica,
          FrecuenciaCardiaca: coerceNumero(f.FrecuenciaCardiaca),
          IMC: coerceNumero(f.IMC),
          Peso: coerceNumero(f.PesoenKg),
        };
      });

      return res.json({ ok: true, data: { registros, consultas } });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      });
    }
  };

  return { ObtenerResumenPropio };
}
