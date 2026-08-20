"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentosController = DocumentosController;
const jwt = require("jsonwebtoken");
const params_web_service_1 = require("../interfaces/params_web_service");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const paths_1 = require("../utils/paths");
function DocumentosController(db) {
    const { executeConnection, executeConnection_FileBinary } = db;
    const ObtenerPaciente = async (req, res) => {
        try {
            const { matricula } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "0" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@IdDocumento", Valor: "" },
                { Nombre: "@IdModifica", Valor: "" }
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const ObtenerArchivos = async (req, res) => {
        try {
            const { matricula } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@IdDocumento", Valor: "" },
                { Nombre: "@IdModifica", Valor: "" }
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            // El listado no debe traer FileBytes (puede pesar varios MB por
            // documento): eso hacía muy lenta cada consulta aunque casi siempre
            // el archivo se sirve desde disco (Direccion). Se manda solo un flag
            // para que el frontend sepa si hay respaldo en BD y lo pida bajo
            // demanda con ObtenerArchivoBytes cuando el archivo físico no exista.
            const data = (result !== null && result !== void 0 ? result : []).map((doc) => {
                const { FileBytes, ...rest } = doc;
                return { ...rest, TieneFileBytes: !!FileBytes };
            });
            return res.json({
                ok: true,
                data
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const ObtenerArchivoBytes = async (req, res) => {
        var _a, _b;
        try {
            const { matricula, idDocumento } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "1" },
                { Nombre: "@Matricula", Valor: matricula },
                { Nombre: "@IdDocumento", Valor: String(idDocumento !== null && idDocumento !== void 0 ? idDocumento : "") },
                { Nombre: "@IdModifica", Valor: "" }
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            const doc = (_a = (result !== null && result !== void 0 ? result : []).find((d) => String(d.IdDocumento) === String(idDocumento))) !== null && _a !== void 0 ? _a : null;
            return res.json({
                ok: true,
                fileBytes: (_b = doc === null || doc === void 0 ? void 0 : doc.FileBytes) !== null && _b !== void 0 ? _b : null
            });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                error: "Error interno",
                message: error.message,
                stack: error.stack
            });
        }
    };
    const BaseDoc = (0, paths_1.resolveUploadsDir)();
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
        destination: (req, file, cb) => {
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
        filename: (req, file, cb) => {
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
        fileFilter: (req, file, cb) => {
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
    const SubirDocumentos = (req, res) => {
        upload(req, res, async (err) => {
            var _a, _b, _c;
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
            if (!req.file) {
                res.status(400).json({ ok: false, error: 'No se pudo subir ningún documento.' });
                return;
            }
            try {
                const { matricula, categoria } = req.body;
                const file = req.file;
                const filePath = file.path;
                const fileBuffer = fs.readFileSync(filePath);
                const fileBase64 = fileBuffer.toString('base64');
                const params = [
                    { Nombre: "@Case", Valor: "0" },
                    { Nombre: "@Matricula", Valor: matricula },
                    { Nombre: "@IdDocumento", Valor: "" },
                    { Nombre: "@IdModifica", Valor: "" }
                ];
                const paciente = await executeConnection("[TNGCORE].[dbo].[SCII_Control_Documentos]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
                // if (!paciente || paciente.length === 0 || !paciente[0].IdPaciente) {
                //   res.status(404).json({ ok: false, error: 'Paciente no encontrado.' });
                //   return;
                // }
                const pacienteId = (_a = paciente[0].IdPaciente) !== null && _a !== void 0 ? _a : "";
                const doc_param = [
                    { Nombre: "@PacienteId", Valor: String(pacienteId) },
                    { Nombre: "@Matricula", Valor: matricula },
                    { Nombre: "@NombrePDF", Valor: file.filename },
                    { Nombre: "@TipoDoc", Valor: String(parseInt(categoria)) },
                    { Nombre: "@Direccion", Valor: filePath.toUpperCase() },
                    // { Nombre: "@FileBytes",  Valor: fileBase64 },
                    { Nombre: "@Estado", Valor: "1" },
                ];
                await executeConnection_FileBinary("[TNGCORE].[dbo].[SCII_Subir_Documentos_Test]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, doc_param, fileBase64);
                res.json({
                    ok: true,
                    message: 'Se guardó el documento correctamente.',
                    file: { name: file.filename, path: filePath }
                });
            }
            catch (error) {
                const mensaje = (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "";
                const tamanoArchivo = (_c = req.file) === null || _c === void 0 ? void 0 : _c.size;
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
    const BorraDocumentos = async (req, res) => {
        try {
            const { idDocumento, idModifica } = req.body;
            const params = [
                { Nombre: "@Case", Valor: "2" },
                { Nombre: "@Matricula", Valor: "" },
                { Nombre: "@IdDocumento", Valor: String(idDocumento !== null && idDocumento !== void 0 ? idDocumento : 0) },
                { Nombre: "@IdModifica", Valor: String(idModifica !== null && idModifica !== void 0 ? idModifica : 0) },
            ];
            const sql = "[TNGCORE].[dbo].[SCII_Control_Documentos]";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            return res.json({
                ok: true,
                data: result
            });
        }
        catch (error) {
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
