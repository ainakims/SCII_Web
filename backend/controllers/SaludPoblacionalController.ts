import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
import { RawIndicadorRow } from "../interfaces/salud_poblacional";
import { normalizarPoblacion } from "../services/poblacionValidacion.service";
import { generarResumenMedicoIA } from "../services/iaResumenPoblacional.service";

const SQL_INDICADORES = "[TNGCORE].[dbo].[SCII_Valores_Indicadores]";

// @Case=1: valores numéricos históricos (Sistolica...Riesgo, Fecha) — una fila
// por lectura de SCII_Indicadores, sin datos demográficos/departamento.
interface FilaValoresCase1 {
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

// @Case=2: catálogo del empleado — una fila por empleado (sexo, fecha de
// nacimiento, departamento/especialidad, perfil clínico), sin ningún valor de
// salud ni Fecha de lectura.
interface FilaCatalogoCase2 {
  Empl_matricula: string;
  Categoria_desc: string | null;
  Departamento: string | null;
  Depto_Series: string | null;
  Especialidad: string | null;
  Sexo: string | null;
  FechaNacimiento: string | null;
}

export function SaludPoblacionalController(db: DB) {
  const { executeConnection } = db;

  // SCII_Valores_Indicadores reparte en @Case=1 (valores) y @Case=2 (catálogo
  // del empleado) lo que el proc anterior (SCII_Valores_Indicadores_2)
  // regresaba en un solo SELECT. Se piden ambos y se combinan aquí por
  // Matricula para reconstruir el shape que espera RawIndicadorRow /
  // normalizarPoblacion, sin tocar el resto del pipeline de validación.
  const obtenerIndicadoresCombinados = async (activo: string): Promise<RawIndicadorRow[]> => {
    const [filasValores, filasCatalogo] = await Promise.all([
      executeConnection<FilaValoresCase1>(SQL_INDICADORES, TipoConsulta.ProcedimientoAlmacenado, [
        { Nombre: "@Case", Valor: "1" },
        { Nombre: "@Activo", Valor: activo },
      ]),
      executeConnection<FilaCatalogoCase2>(SQL_INDICADORES, TipoConsulta.ProcedimientoAlmacenado, [
        { Nombre: "@Case", Valor: "2" },
        { Nombre: "@Activo", Valor: activo },
      ]),
    ]);

    const catalogoPorMatricula = new Map<string, FilaCatalogoCase2>();
    (Array.isArray(filasCatalogo) ? filasCatalogo : []).forEach((c) => {
      const clave = String(c.Empl_matricula ?? "").trim().toUpperCase();
      if (clave) catalogoPorMatricula.set(clave, c);
    });

    // El proc anterior armaba esto con un INNER JOIN contra el catálogo de
    // empleados ya filtrado (sin matrículas de prueba/malformadas): una lectura
    // de @Case=1 que no tenga empleado correspondiente en @Case=2 es "ruido"
    // (matrícula de prueba, dato huérfano, etc.) y se descarta, igual que antes.
    return (Array.isArray(filasValores) ? filasValores : [])
      .reduce<RawIndicadorRow[]>((acc, v) => {
        const catalogo = catalogoPorMatricula.get(String(v.Matricula ?? "").trim().toUpperCase());
        if (!catalogo) return acc;

        acc.push({
          Id: v.Id,
          Matricula: v.Matricula,
          Sistolica: v.Sistolica,
          Diastolica: v.Diastolica,
          Glucosa: v.Glucosa,
          Colesterol: v.Colesterol,
          Trigliceridos: v.Trigliceridos,
          Peso: v.Peso,
          Altura: v.Altura,
          PA: v.PA,
          IMC: v.IMC,
          ICT: v.ICT,
          Riesgo: v.Riesgo,
          Fecha: v.Fecha,
          FechaNacimiento: catalogo.FechaNacimiento,
          Categoria_desc: catalogo.Categoria_desc,
          Departamento: catalogo.Departamento,
          Depto_Series: catalogo.Depto_Series,
          Especialidad: catalogo.Especialidad,
          Sexo: catalogo.Sexo,
        });
        return acc;
      }, []);
  };

  // Regresa el historial completo de evaluaciones ya normalizado/validado
  // (capas RawData -> NormalizedData -> ValidatedData, sección 39 del documento).
  // El filtrado y la agregación estadística se hacen en el frontend, igual que
  // en el resto del sistema (ver Indicadores.tsx).
  const ObtenerDatos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const filas = await obtenerIndicadoresCombinados("1");
      const data = normalizarPoblacion(filas);

      return res.json({
        ok: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      });
    }
  };

  // Historial de indicadores de UN empleado (Expediente > seleccionar matrícula),
  // en vez de traer toda la población y filtrar en el frontend. Mismo shape de
  // salida que ObtenerDatos (RegistroValidado[]) para reusar el resto del pipeline.
  // El SP no filtra por empleado en ningún @Case, así que se trae el censo
  // combinado (igual que ObtenerDatos) y se filtra aquí a una sola matrícula;
  // como no se sabe de antemano si es activo o reingreso, primero se busca en
  // activos y solo si no aparece se intenta en inactivos (mismo patrón que
  // /AnalisisIndividual/EvaluarInactivos).
  const ObtenerDatosPorEmpleado = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;

      if (!matricula) {
        return res.status(400).json({ ok: false, message: "Se requiere la matrícula del empleado." });
      }

      const clave = String(matricula).trim().toUpperCase();
      const filtrarPorMatricula = (filas: RawIndicadorRow[]) =>
        filas.filter((f) => String(f.Matricula ?? "").trim().toUpperCase() === clave);

      let filas = filtrarPorMatricula(await obtenerIndicadoresCombinados("1"));
      if (filas.length === 0) {
        filas = filtrarPorMatricula(await obtenerIndicadoresCombinados("0"));
      }

      const data = normalizarPoblacion(filas);

      return res.json({
        ok: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      });
    }
  };

  const ResumenIA = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { agregados } = req.body;

      if (!agregados || typeof agregados !== "object") {
        return res.status(400).json({ ok: false, message: "Se requiere el payload de agregados." });
      }

      const { resumenGeneral, departamentos, modelo } = await generarResumenMedicoIA(agregados);

      return res.json({ ok: true, resumenGeneral, departamentos, modelo });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
      });
    }
  };

  return { ObtenerDatos, ObtenerDatosPorEmpleado, ResumenIA };
}
