const jwt = require("jsonwebtoken");
import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { Parametros, TipoConsulta } from "../interfaces/params_web_service";
const fs   = require("fs");
const path = require("path");

// const { poolPromise, sql } = require("../server/config/db");
const { generarHistoriaClinicaDocx } = require("../services/generarHistoriaClinica");
const { generarPDF } = require("../services/generarPDF");

export function EvaluacionController(db: DB) {
  const { executeConnection } = db;

  const InformacionPerfil = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      const params: Parametros[] = [
        { Nombre: "@Case",       Valor: "0" },
        // { Nombre: "@PacienteId", Valor: "" },
        { Nombre: "@Matricula",  Valor: String(matricula ?? "") },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      
      return res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        message: error.message,
      });
    }
  };

  const AgregarEvaluacion = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { medico, paciente, matricula, ficha, edadInicioLaboral, antLaborales, agentes, antFamiliares, antPatologicos, vacunas, antNoPatologico, gineco, incapacidadRiesgo, incapacidadValuacion, incapacidadEG, incapacidadComentario, enfermedadActual, manoDominante, vitalSigns, expCabeza, expOidos, expOjos, agudezaOD, agudezaOI, usaLentes, expBoca, expNariz, expCuello, expPrecordial, expMTor, expMPel, expAbdomen, expGenitales, expPiel, expColCervical, expColLumbar, labs, expRadiografia, expHallazgos, expGabinete, conclusiones } = req.body;
      const sql = "[TNGCORE].[dbo].[SCII_Agregar_Evaluacion]";

      const paramsFicha: Parametros[] = [
        { Nombre: "@Case",            Valor: "0" },
        { Nombre: "@Matricula",       Valor: String(matricula.trim() ?? null) },
        { Nombre: "@FechaNacimiento", Valor: String(ficha?.fechaNacimiento.trim() ?? null) },
        { Nombre: "@Genero",          Valor: String(ficha?.genero.trim() ?? null).trim() },
        { Nombre: "@EstadoCivil",     Valor: String(ficha?.estadoCivil.trim() ?? null) },
        { Nombre: "@Escolaridad",     Valor: String(ficha?.escolaridad.trim() ?? null).trim() },
        { Nombre: "@NoIMSS",          Valor: String(ficha?.noImss.trim() ?? null) },
        { Nombre: "@Contacto",        Valor: String(ficha?.contactoEmergencia ?? null) },
        { Nombre: "@NumContacto",     Valor: String(ficha?.numeroContacto ?? null) },
      ];

      const resultFicha = await executeConnection<{ IdFicha: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsFicha);
      const idFicha = resultFicha[0].IdFicha;

      const paramsLaboral: Parametros[] = [
        { Nombre: "@Case",               Valor: "1" },
        { Nombre: "@EdadInicio",         Valor: String(edadInicioLaboral ?? null) },
        { Nombre: "@AntecedenteLaboral", Valor: JSON.stringify(antLaborales || []) },
        { Nombre: "@ExposicionAgentes",  Valor: JSON.stringify(agentes || {}) },
      ]

      const hayLaboral =
        (edadInicioLaboral !== null && edadInicioLaboral !== undefined && String(edadInicioLaboral).trim() !== "") ||
        (Array.isArray(antLaborales) && antLaborales.some((r: any) =>
          String(r.empresa ?? "").trim() || String(r.puesto ?? "").trim() || String(r.tiempo ?? "").trim()
        )) ||
        (agentes && typeof agentes === "object" && Object.values(agentes).some((v: any) =>
          Array.isArray(v)
            ? v.some((o: any) => String(o?.tipo ?? "").trim() || String(o?.tiempo ?? "").trim() || String(o?.puesto ?? "").trim())
            : (String(v?.tiempo ?? "").trim() || String(v?.puesto ?? "").trim())
        ));

      let idLaboral = 0;
      if (hayLaboral) {
        const resultLaboral = await executeConnection<{ IdLaboral: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsLaboral);
        idLaboral = resultLaboral[0]?.IdLaboral ?? 0;
      }

      const paramsFamiliar: Parametros[] = [
        { Nombre: "@Case",                Valor: "2" },
        { Nombre: "@AntecedenteFamiliar", Valor: JSON.stringify(antFamiliares || {}) },
      ]

      const hayFamiliar =
        antFamiliares && typeof antFamiliares === "object" &&
        Object.values(antFamiliares).some((entry: any) =>
          typeof entry === "object" && entry !== null &&
          Object.values(entry).some((v: any) => v !== null)
        );

      let idFamiliar = 0;
      if (hayFamiliar) {
        const resultFamiliar = await executeConnection<{ IdFamiliar: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsFamiliar);
        idFamiliar = resultFamiliar[0]?.IdFamiliar ?? 0;
      }

      const esquemaCovid = {
        covid1ra: { checked: vacunas?.covid1ra ?? false, fecha: vacunas?.covid1raFecha ?? "" },
        covid2da: { checked: vacunas?.covid2da ?? false, fecha: vacunas?.covid2daFecha ?? "" },
        covidRF:  { checked: vacunas?.covidRF  ?? false, fecha: vacunas?.covidRFFecha  ?? "" },
      };

      const esquemaVacuna = {
        influenza:   { checked: vacunas?.inflChk  ?? false, fecha: vacunas?.influenza   ?? "" },
        toxoide:     { checked: vacunas?.toxChk   ?? false, fecha: vacunas?.toxoide     ?? "" },
        hepatitisB:  { checked: vacunas?.hepaChk  ?? false, fecha: vacunas?.hepatitisB  ?? "" },
        neumococica: { checked: vacunas?.neumoChk ?? false, fecha: vacunas?.neumococica ?? "" },
      };

      const paramsPatologico: Parametros[] = [
        { Nombre: "@Case",                  Valor: "3" },
        { Nombre: "@AntecedentePatologico", Valor: JSON.stringify(antPatologicos || {}) },
        { Nombre: "@EsquemaVacuna",         Valor: JSON.stringify(esquemaVacuna) },
        { Nombre: "@EsquemaCovid",          Valor: JSON.stringify(esquemaCovid) },
      ]

      var idPatologico = 0;
      const resultPatologico = await executeConnection<{ IdPatologico: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsPatologico);
      idPatologico = resultPatologico[0]?.IdPatologico ?? 0;

      const paramsNoPatologico: Parametros[] = [
        { Nombre: "@Case",                    Valor: "4" },
        { Nombre: "@AntecedenteNoPatologico", Valor: JSON.stringify(antNoPatologico || {}) },
      ]

      var idNoPatologico = 0;
      const resultNoPatologico = await executeConnection<{ IdNoPatologico: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsNoPatologico);
      idNoPatologico = resultNoPatologico[0]?.IdNoPatologico ?? 0;

      const esMasculino = String(ficha?.genero ?? "").trim().toUpperCase() === "M";

      let idGineco = 0;

      if (!esMasculino) {
        const paramsGineco: Parametros[] = [
          { Nombre: "@Case",          Valor: "5" },
          { Nombre: "@Menarquia",     Valor: String(gineco?.menarquia) },
          { Nombre: "@Ritmo",         Valor: String(gineco?.ritmo) },
          { Nombre: "@Papanicolau",   Valor: String(gineco?.papanicolau) },
          { Nombre: "@FUM",           Valor: String(gineco?.fum) },
          { Nombre: "@Dismenorrea",   Valor: String(gineco?.dismenorrea) },
          { Nombre: "@Incapacitante", Valor: String(gineco?.incapacitante) },
          { Nombre: "@Dias",          Valor: String(gineco?.diasDismenorrea) },
          { Nombre: "@Gestas",        Valor: String(gineco?.gestas) },
          { Nombre: "@Partos",        Valor: String(gineco?.partos) },
          { Nombre: "@Cesareas",      Valor: String(gineco?.cesareas) },
          { Nombre: "@Abortos",       Valor: String(gineco?.abortos) },
          { Nombre: "@Mamas",         Valor: String(gineco?.mamas) },
          { Nombre: "@USG",           Valor: String(gineco?.usg) },
          { Nombre: "@Mastografia",   Valor: String(gineco?.mastografia) },
          { Nombre: "@BiRads",        Valor: String(gineco?.birads) },
        ];

        const resultGineco = await executeConnection<{ IdGineco: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsGineco);
        idGineco = resultGineco[0]?.IdGineco ?? 0;
      }

      const paramsIncapacidad: Parametros[] = [
        { Nombre: "@Case",             Valor: "6" },
        { Nombre: "@RiesgoTrabajo",    Valor: String(incapacidadRiesgo) },
        { Nombre: "@EnfermedadGral",   Valor: String(incapacidadEG).trim() },
        { Nombre: "@ManoDominante",    Valor: (typeof manoDominante === "string" ? manoDominante : "").trim() },
        { Nombre: "@Valuacion",        Valor: String(incapacidadValuacion) },
        { Nombre: "@Comentario",       Valor: String(incapacidadComentario) },
        { Nombre: "@PadeceEnfermedad", Valor: String(enfermedadActual) },
      ]

      var idIncapacidad = 0;
      const resultIncapacidad = await executeConnection<{ IdIncapacidad: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsIncapacidad);
      idIncapacidad = resultIncapacidad[0]?.IdIncapacidad ?? 0;

      const agudezaVisual = {
        OD: agudezaOD || {},
        OI: agudezaOI || {},
        usaLentes: usaLentes ?? null,
      };

      const paramsExploracion: Parametros[] = [
        { Nombre: "@Case",                  Valor: "7" },
        { Nombre: "@SignosVitales",         Valor: JSON.stringify(vitalSigns|| {}) },
        { Nombre: "@Cabeza",                Valor: JSON.stringify(expCabeza|| {}) },
        { Nombre: "@Oidos",                 Valor: JSON.stringify(expOidos|| {}) },
        { Nombre: "@Ojos",                  Valor: JSON.stringify(expOjos|| {}) },
        { Nombre: "@AgudezaVisual",         Valor: JSON.stringify(agudezaVisual|| {}) },
        { Nombre: "@Boca",                  Valor: JSON.stringify(expBoca|| {}) },
        { Nombre: "@Nariz",                 Valor: JSON.stringify(expNariz|| {}) },
        { Nombre: "@Cuello",                Valor: JSON.stringify(expCuello|| {}) },
        { Nombre: "@AreaPrecordial",        Valor: JSON.stringify(expPrecordial|| {}) },
        { Nombre: "@MiembrosToracicos",     Valor: JSON.stringify(expMTor|| {}) },
        { Nombre: "@MiembrosPelvicos",      Valor: JSON.stringify(expMPel|| {}) },
        { Nombre: "@Abdomen",               Valor: JSON.stringify(expAbdomen|| {}) },
        { Nombre: "@Genitales",             Valor: JSON.stringify(expGenitales|| {}) },
        { Nombre: "@PielAnexos",            Valor: JSON.stringify(expPiel|| {}) },
        { Nombre: "@ColumnaCervicalDorsal", Valor: JSON.stringify(expColCervical|| {}) },
        { Nombre: "@ColumnaLumbar",         Valor: JSON.stringify(expColLumbar|| {}) },
      ]

      var idExploracion = 0;
      const resultExploracion = await executeConnection<{ IdExploracion: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsExploracion);
      idExploracion = resultExploracion[0]?.IdExploracion ?? 0;

      const paramsEstudios: Parametros[] = [
        { Nombre: "@Case",        Valor: "8" },
        { Nombre: "@Laboratorio", Valor: JSON.stringify(labs || {}) },
        { Nombre: "@Radiografia", Valor: JSON.stringify(expRadiografia || {}) },
        { Nombre: "@Hallazgos",   Valor: JSON.stringify(expHallazgos || {}) },
        { Nombre: "@Gabinete",    Valor: JSON.stringify(expGabinete || {}) },
      ]

      var idEstudios = 0;
      const resultEstudios = await executeConnection<{ IdEstudios: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsEstudios);
      idEstudios = resultEstudios[0]?.IdEstudios ?? 0;

      const diagnosticos = [
        conclusiones?.diagnostico1,
        conclusiones?.diagnostico2,
        conclusiones?.diagnostico3,
        conclusiones?.diagnostico4,
      ].filter(Boolean);
      
      const recomendaciones = [
        conclusiones?.recomendacion1,
        conclusiones?.recomendacion2,
        conclusiones?.recomendacion3,
      ].filter(Boolean);

      const paramsConclusion: Parametros[] = [
        { Nombre: "@Case",            Valor: "9" },
        { Nombre: "@Diagnosticos",    Valor: JSON.stringify(diagnosticos) },
        { Nombre: "@Recomendaciones", Valor: JSON.stringify(recomendaciones) },
        { Nombre: "@GradoSalud",      Valor: String(conclusiones?.resultado ?? null) },
        { Nombre: "@Observaciones",   Valor: String(conclusiones?.observaciones ?? null) },
      ]

      var idConclusion = 0;
      const resultConclusion = await executeConnection<{ IdConclusion: number }>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsConclusion);
      idConclusion = resultConclusion[0]?.IdConclusion ?? 0;

      const today = new Date().toISOString().slice(0, 19).replace("T", " ");

      // console.log("matricula ", matricula);

      const paramsEvaluacion: Parametros[] = [
        { Nombre: "@Case",            Valor: "10" },
        { Nombre: "@MedicoId",        Valor: medico },
        { Nombre: "@PacienteId",      Valor: paciente ?? '' },
        { Nombre: "@Matricula",       Valor: matricula ?? '' },
        { Nombre: "@Ficha",           Valor: idFicha },
        { Nombre: "@Laboral",         Valor: idLaboral },
        { Nombre: "@Familiar",        Valor: idFamiliar },
        { Nombre: "@Patologico",      Valor: idPatologico },
        { Nombre: "@NoPatologico",    Valor: idNoPatologico },
        { Nombre: "@Gineco",          Valor: idGineco },
        { Nombre: "@Incapacidad",     Valor: idIncapacidad },
        { Nombre: "@Exploracion",     Valor: idExploracion },
        { Nombre: "@Estudios",        Valor: idEstudios },
        { Nombre: "@Conclusion",      Valor: idConclusion },
        { Nombre: "@FechaEvaluacion", Valor: today },
        
        // { Nombre: "@Tipo",            Valor: null },
      ]

      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, paramsEvaluacion);

      try {
        const mat = String(matricula ?? "").trim().replace(/[^a-zA-Z0-9]/g, "");
        if (mat) {
          const borradorPath = path.join(__dirname, "..", "data", "borradores", `${mat}.json`);
          if (fs.existsSync(borradorPath)) fs.unlinkSync(borradorPath);
        }
      } catch { /* no crítico */ }

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

  const BORRADORES_DIR = path.join(__dirname, "..", "data", "borradores");

  const GuardarBorrador = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula, pacienteId, datos } = req.body;
      if (!matricula) return res.status(400).json({ ok: false, message: "Matrícula requerida" });

      const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
      fs.mkdirSync(BORRADORES_DIR, { recursive: true });

      const filePath = path.join(BORRADORES_DIR, `${mat}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        datos,
        pacienteId: pacienteId ?? null,
        fechaGuardado: new Date().toISOString(),
      }), "utf-8");

      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };

  const ObtenerBorrador = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      if (!matricula) return res.status(400).json({ ok: false, message: "Matrícula requerida" });

      const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
      const filePath = path.join(BORRADORES_DIR, `${mat}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ ok: false });
      }

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return res.json({ ok: true, data: content });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };

  const EliminarBorrador = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula } = req.body;
      if (!matricula) return res.status(400).json({ ok: false, message: "Matrícula requerida" });

      const mat = String(matricula).trim().replace(/[^a-zA-Z0-9]/g, "");
      const filePath = path.join(BORRADORES_DIR, `${mat}.json`);

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const ObtenerEvaluacion = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { matricula, pacienteId } = req.params;
      const params: Parametros[] = [
        { Nombre: "@Case",       Valor: "1" },
        { Nombre: "@Matricula",  Valor: String(matricula ?? '') },
        { Nombre: "@PacienteId", Valor: String(pacienteId ?? '') },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "Sin evaluación previa." });
      }

      return res.json(result[0]);
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        message: error.message,
      });
    }
  };

  const GenerarHistoriaClinica = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { evaluacionId, especialidad } = req.body;
      if (!evaluacionId) return res.status(400).json({ message: "Se requiere evaluacionId." });

      const params: Parametros[] = [
        { Nombre: "@Case", Valor: "2" },
        { Nombre: "@Id",   Valor: String(evaluacionId ?? "") },
      ];

      const sql = "[TNGCORE].[dbo].[SCII_Obtener_Evaluacion_Historial]";
      const result = await executeConnection<any>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      
      if (!result || result.length === 0) {
        return res.status(404).json({
          ok: false,
          message: "Evaluación no encontrada."
        });
      }

      const row = result[0];

      const jp = (v: any) => {
        try { return v ? JSON.parse(v) : null; } catch { return null; }
      };

      const av = jp(row.AgudezaVisual) || {};

      const vacunas = {
        ...(jp(row.EsquemaVacuna) || {}),
        ...(jp(row.EsquemaCovid) || {})
      };

      const diags  = jp(row.Diagnosticos) || [];
      const recoms = jp(row.Recomendaciones) || [];

      const data = {
        matricula: row.MatriculaPac,
        nombre: row.NombrePaciente || '',
        fechaEval: row.FechaEvaluacion,
        edad: '',
        genero: row.Genero || '',
        estadoCivil: row.EstadoCivil || '',
        fechaNacimiento: row.FechaNacimiento || '',
        escolaridad: row.Escolaridad || '',
        noImss: row.NoIMSS || '',
        especialidad: especialidad || '',
        puestoAspira: '',
        contactoEmergencia: row.Contacto || '',
        numeroContacto: row.NumContacto || '',
        edadInicioLaboral: row.EdadInicio,
        antLaborales: jp(row.AntecedenteLaboral) || [],
        agentes: jp(row.ExposicionAgentes)  || {},

        antFamiliares: (() => {
          const af = jp(row.AntecedenteFamiliar) || {};
          const siNo = (val: any) => val === true ? 'SI' : '';
          const enfs = ['Tuberculosis','Sífilis','Hipertensión','Diabetes','Cardiópatas','Epilépticos','Oncológicos','Malformaciones congénitas','Otros'];

          return enfs.map(e => ({
            antecedente: e,
            abuelos: siNo(af[e]?.abuelos),
            padres: siNo(af[e]?.padres),
            hermanos: siNo(af[e]?.hermanos),
            hijos: siNo(af[e]?.hijos),
            otros: siNo(af[e]?.otros),
          }));
        })(),

        antPatologicos: jp(row.AntecedentePatologico) || {},
        vacunas,
        antNoPatologico: jp(row.AntecedenteNoPatologico) || {},

        gineco: {
          menarquia: row.Menarquia,
          ritmo: row.Ritmo,
          papanicolau: row.Papanicolau,
          fum: row.FUM,
          dismenorrea: row.Dismenorrea,
          incapacitante: row.Incapacitante,
          diasDismenorrea: row.Dias,
          gestas: row.Gestas,
          partos: row.Partos,
          cesareas: row.Cesareas,
          abortos: row.Abortos,
          mamas: row.Mamas,
          usg: row.USG,
          mastografia: row.Mastografia,
          birads: row.BiRads,
        },

        incapacidadRiesgo: row.RiesgoTrabajo,
        incapacidadEG: row.EnfermedadGral,
        manoDominante: row.ManoDominante,
        incapacidadValuacion: row.Valuacion,
        incapacidadComentario: row.Comentario,
        enfermedadActual: row.PadeceEnfermedad,

        vitalSigns: jp(row.SignosVitales) || {},
        expCabeza: jp(row.Cabeza) || {},
        expOidos: jp(row.Oidos) || {},
        expOjos: jp(row.Ojos) || {},
        agudezaOD: av.OD || {},
        agudezaOI: av.OI || {},
        usaLentes: av.usaLentes ?? null,
        expBoca: jp(row.Boca) || {},
        expNariz: jp(row.Nariz) || {},
        expCuello: jp(row.Cuello) || {},
        expPrecordial: jp(row.AreaPrecordial) || {},
        expMTor: jp(row.MiembrosToracicos) || {},
        expMPel: jp(row.MiembrosPelvicos) || {},
        expAbdomen: jp(row.Abdomen) || {},
        expGenitales: jp(row.Genitales) || {},
        expPiel: jp(row.PielAnexos) || {},
        expColCervical: jp(row.ColumnaCervicalDorsal) || {},
        expColLumbar: jp(row.ColumnaLumbar) || {},

        labs: jp(row.Laboratorio) || {},
        expRadiografia: jp(row.Radiografia) || {},
        expHallazgos: jp(row.Hallazgos) || {},
        expGabinete: jp(row.Gabinete) || {},

        conclusiones: {
          diagnostico1: diags[0] || '',
          diagnostico2: diags[1] || '',
          diagnostico3: diags[2] || '',
          diagnostico4: diags[3] || '',
          recomendacion1: recoms[0] || '',
          recomendacion2: recoms[1] || '',
          recomendacion3: recoms[2] || '',
          resultado: row.GradoSalud || '',
          gradoSalud: row.GradoSalud || '',
          observaciones: row.Observaciones || '',
        },
      };

      const docxBuffer = await generarHistoriaClinicaDocx(data);

      const mat = String(row.MatriculaPac || row.PacienteId).trim();
      const ahora = new Date();
      const fechaHora = ahora.toLocaleString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
        .replace(/\//g, "-").replace(", ", "_").replace(/:/g, "-");
      const baseName = `Historia_Clinica_${mat}_${fechaHora}`;

      // Convertir DOCX a PDF via servicio interno y guardar en documentos
      try {
        const axios = require("axios");
        const FormData = require("form-data");

        const form = new FormData();
        form.append("documentName", baseName);
        form.append("file", docxBuffer, {
          filename: `${baseName}.docx`,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const pdfRes = await axios.post(
          "http://10.133.18.28:1616/utils/docx_to_pdf",
          form,
          { headers: form.getHeaders(), responseType: "arraybuffer", timeout: 30000 }
        );

        const pdfBuffer  = Buffer.from(pdfRes.data);
        const pdfName    = `${baseName}.pdf`;
        const uploadsDir = path.join(__dirname, "..", "uploads", mat);
        const filePath   = path.join(uploadsDir, pdfName);

        // Guardar PDF en disco
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(filePath, pdfBuffer);

        // Obtener IdPaciente
        const paramsDoc: Parametros[] = [
          { Nombre: "@Case", Valor: "0" },
          { Nombre: "@Matricula", Valor: mat },
          { Nombre: "@IdDocumento", Valor: "" },
          { Nombre: "@IdModifica", Valor: "" },
        ];
        const paciente = await executeConnection<{ IdPaciente: number }>(
          "[TNGCORE].[dbo].[SCII_Control_Documentos]",
          TipoConsulta.ProcedimientoAlmacenado,
          paramsDoc
        );

        if (!paciente?.length || !paciente[0].IdPaciente) {
          return res.status(404).json({ ok: false, message: "Paciente no encontrado al guardar el documento." });
        }

        // Registrar en BD
        const fileBase64  = pdfBuffer.toString("base64");
        const paramsSubir: Parametros[] = [
          { Nombre: "@PacienteId", Valor: String(paciente[0].IdPaciente) ?? '' },
          { Nombre: "@Matricula", Valor: mat },
          { Nombre: "@NombrePDF", Valor: pdfName },
          { Nombre: "@TipoDoc", Valor: "2" },
          { Nombre: "@Direccion", Valor: filePath.toUpperCase() },
          { Nombre: "@FileBytes", Valor: fileBase64 },
          { Nombre: "@Estado", Valor: "1" },
        ];
        await executeConnection<boolean>(
          "[TNGCORE].[dbo].[SCII_Subir_Documentos]",
          TipoConsulta.ProcedimientoAlmacenado,
          paramsSubir
        );

        return res.json({ ok: true, matricula: mat, archivo: pdfName });

      } catch (pdfError: any) {
        return res.status(502).json({ ok: false, message: "Error al generar o guardar el PDF.", detail: pdfError?.message });
      }
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: "Error interno",
        message: error.message,
        stack: error.stack
      });
    }
  };

  return { InformacionPerfil, AgregarEvaluacion, ObtenerEvaluacion, GenerarHistoriaClinica, GuardarBorrador, ObtenerBorrador, EliminarBorrador };
}