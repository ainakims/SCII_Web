const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

  const BaseDoc = path.join(__dirname, '..', 'uploads');

  if (!fs.existsSync(BaseDoc)) {
    fs.mkdirSync(BaseDoc, { recursive: true });
  }

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
      cb(null, file.originalname);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos PDF'));
      }
    }
  }).single('document');

  const SubirDocumentos = (req: Request, res: Response): void => {
    upload(req as any, res as any, async (err: any) => {
      if (err) {
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
        const fileBytes: number[] = Array.from(fileBuffer);
        const fileBase64: string = fileBuffer.toString('base64');

        function limpiarNombrePDF(filename: any): string {
          return String(filename)
              .replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9.\-]/g, '');
        }
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
          { Nombre: "@NombrePDF",  Valor: limpiarNombrePDF(file.filename) },
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
        res.status(500).json({ ok: false, error: error.message });
        // console.log("Error en SubirDocumentos \n:", JSON.stringify(error.message));
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

  return { ObtenerPaciente, ObtenerArchivos, SubirDocumentos, BorraDocumentos };
}