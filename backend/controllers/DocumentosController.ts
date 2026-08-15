const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
const fs = require('fs');
const path = require('path');
const multer = require('multer');
import { resolveUploadsDir } from "../utils/paths";

export function DocumentosController(db: DB) {
  const { executeConnection,executeConnection_FileBinary } = db;

  const ObtenerPaciente = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {matricula} = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "0" },
        { Nombre: "@Matricula", Valor: matricula },
        { Nombre: "@IdDocumento", Valor: "" },
        { Nombre: "@IdModifica", Valor: "" }
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
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

  const ObtenerArchivos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {matricula} = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "1" },
        { Nombre: "@Matricula", Valor: matricula },
        { Nombre: "@IdDocumento", Valor: "" },
        { Nombre: "@IdModifica", Valor: "" }
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      // El listado no debe traer FileBytes (puede pesar varios MB por
      // documento): eso hacía muy lenta cada consulta aunque casi siempre
      // el archivo se sirve desde disco (Direccion). Se manda solo un flag
      // para que el frontend sepa si hay respaldo en BD y lo pida bajo
      // demanda con ObtenerArchivoBytes cuando el archivo físico no exista.
      const data = (result ?? []).map((doc: any) => {
        const { FileBytes, ...rest } = doc;
        return { ...rest, TieneFileBytes: !!FileBytes };
      });

      return res.json({
        ok: true,
        data
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

  const ObtenerArchivoBytes = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula, idDocumento } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",      Valor: "1" },
        { Nombre: "@Matricula", Valor: matricula },
        { Nombre: "@IdDocumento", Valor: String(idDocumento ?? "") },
        { Nombre: "@IdModifica", Valor: "" }
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      const doc = (result ?? []).find((d: any) => String(d.IdDocumento) === String(idDocumento)) ?? null;

      return res.json({
        ok: true,
        fileBytes: doc?.FileBytes ?? null
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

  const BaseDoc = resolveUploadsDir();

  if (!fs.existsSync(BaseDoc)) {
    fs.mkdirSync(BaseDoc, { recursive: true });
  }

  // Tope de PDF crudo aceptado por el formulario. OJO: el archivo se manda al
  // servicio SOAP externo codificado en Base64 (ver bd_connection.service.ts),
  // lo que infla su tamaño ~33% en el request real — un PDF de 10 MB llega
  // como ~13.3 MB de Base64 más el envoltorio SOAP. Si el servicio rechaza con
  // "Maximum request length exceeded" incluso dentro de este tope, es porque
  // su límite real (httpRuntime maxRequestLength) es menor a esos ~13.3 MB.
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB de PDF crudo

  // El nombre del archivo se usa tal cual como ruta en disco y arma la URL de
  // /uploads/:matricula/:nombre. Acentos, ñ, etc. son texto Unicode normal y
  // no rompen nada — lo que sí rompe una ruta son los caracteres reservados
  // del sistema y los de control invisibles, así que solo esos se bloquean.
  const CARACTERES_PROHIBIDOS_NOMBRE = /[\\/:*?"<>|\x00-\x1F]/;

  const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const { matricula } = req.body;

      if (!matricula) {
        return cb(new Error('Matrícula necesaria para subir el documento.'));
      }

      const patientDir = path.join(BaseDoc, matricula);

      if (!fs.existsSync(patientDir)) {
        fs.mkdirSync(patientDir, { recursive: true });
      }

      cb(null, patientDir);
    },

    filename: (req: any, file: any, cb: any) => {
      // busboy (usado por multer) interpreta el nombre del archivo que manda
      // el navegador como Latin-1, así que cualquier acento/ñ llega ya
      // corrupto en file.originalname (ej. "situación" -> "situaciÃ³n").
      // Se reinterpretan esos mismos bytes como UTF-8 para recuperar el
      // nombre real antes de usarlo en disco/BD.
      const nombreCorregido = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, nombreCorregido);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('Solo se permiten archivos PDF'));
        return;
      }
      if (CARACTERES_PROHIBIDOS_NOMBRE.test(file.originalname)) {
        cb(new Error('El nombre del archivo tiene caracteres no permitidos ( \\ / : * ? " < > | ). Renómbralo y vuelve a intentar.'));
        return;
      }
      cb(null, true);
    }
  }).single('document');

  const SubirDocumentos = (req: Request, res: Response): void => {
    upload(req as any, res as any, async (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            ok: false,
            error: `El archivo supera el tamaño máximo permitido (${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1)} MB).`
          });
          return;
        }
        res.status(400).json({ ok: false, error: err.message });
        return;
      }

      if (!(req as any).file) {
        res.status(400).json({ ok: false, error: 'No se pudo subir ningún documento.' });
        return;
      }

      try {
        const { matricula, categoria } = req.body;
        const file = (req as any).file;
        const filePath: string = file.path;
        const fileBuffer: Buffer = fs.readFileSync(filePath);
        const fileBase64: string = fileBuffer.toString('base64');

        const params: Parametros[] = [
          { Nombre: "@Case",      Valor: "0" },
          { Nombre: "@Matricula", Valor: matricula },
          { Nombre: "@IdDocumento", Valor: "" },
          { Nombre: "@IdModifica", Valor: "" }
        ];

        const paciente = await executeConnection<{ IdPaciente: number }>("[TNGCORE].[dbo].[SCII_Control_Documentos]", TipoConsulta.ProcedimientoAlmacenado, params);

        // if (!paciente || paciente.length === 0 || !paciente[0].IdPaciente) {
        //   res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
        //   return;
        // }

        const pacienteId = paciente[0].IdPaciente ?? "";

        const doc_param: Parametros[] = [
          { Nombre: "@PacienteId", Valor: String(pacienteId) },
          { Nombre: "@Matricula",  Valor: matricula },
          { Nombre: "@NombrePDF",  Valor: file.filename },
          { Nombre: "@TipoDoc",    Valor: String(parseInt(categoria)) },
          { Nombre: "@Direccion",  Valor: filePath.toUpperCase() },
          // { Nombre: "@FileBytes",  Valor: fileBase64 },
          { Nombre: "@Estado",     Valor: "1" },
        ];
        await executeConnection_FileBinary<boolean>("[TNGCORE].[dbo].[SCII_Subir_Documentos_Test]", TipoConsulta.ProcedimientoAlmacenado, doc_param, fileBase64);


        res.json({
          ok: true,
          message: 'Se guardó el documento correctamente.',
          file: { name: file.filename, path: filePath }
        });
      } catch (error: any) {
        const mensaje: string = error?.message ?? "";
        const tamanoArchivo = (req as any).file?.size;
        console.error(`[SubirDocumentos] Falló el envío al servicio SOAP. Archivo: ${tamanoArchivo} bytes (${(tamanoArchivo / (1024 * 1024)).toFixed(2)} MB). Error crudo: ${mensaje}`);
        if (mensaje.includes("Maximum request length exceeded")) {
          res.status(413).json({
            ok: false,
            error: "El servicio de almacenamiento externo rechazó el archivo por tamaño (su límite es menor a los 10 MB permitidos aquí). Intenta con un PDF de menor tamaño o solicita aumentar el límite en ese servicio."
          });
          return;
        }
        res.status(500).json({ ok: false, error: mensaje });
      }
    });
  };

  const BorraDocumentos = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { idDocumento, idModifica } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",        Valor: "2"                             },
        { Nombre: "@Matricula",   Valor: ""                              },
        { Nombre: "@IdDocumento", Valor: String(idDocumento ?? 0)        },
        { Nombre: "@IdModifica",  Valor: String(idModifica  ?? 0)        },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
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

  return { ObtenerPaciente, ObtenerArchivos, ObtenerArchivoBytes, SubirDocumentos, BorraDocumentos };
}