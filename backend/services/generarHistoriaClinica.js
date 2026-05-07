'use strict';

const Docxtemplater = require('docxtemplater');
// const expressionModule = require("docxtemplater-expression-module");
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

async function generarHistoriaClinicaDocx(data) {
  try {
    const templatePath = path.join(__dirname, '../templates/HISTORIA CLINICA MODIFICADA.docx');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Plantilla no encontrada: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // modules: [new expressionModule()]
    });

    const estadoCivil = {
      "S": "Soltero",
      "C": "Casado",
      "D": "Divorciado",
      "V": "Viudo"
    };

    const escolaridad = {
      1: "Sin escolaridad",
      2: "Educación preescolar",
      3: "Educación primaria",
      4: "Educación secundaria",
      5: "Educación media superior",
      6: "Licenciatura",
      7: "Especialidad",
      8: "Maestría",
      9: "Doctorado"
    };

    // Helper: garantiza string limpio; los campos vacíos del XML llegan como objetos { '$': ... }
    const s = (v) => (typeof v === 'string' ? v.trim() : '');

    const docData = {
      matricula: s(data.matricula),
      nombre: s(data.nombre),
      fechaEval: data.fechaEval ? new Date(data.fechaEval).toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      edad: data.fechaNacimiento ? Math.floor((new Date().setHours(0,0,0,0) - new Date(data.fechaNacimiento).setHours(0,0,0,0)) / 31557600000) + ' años' : '',
      genero: s(data.genero) === "M" ? "Masculino" : s(data.genero) === "F" ? "Femenino" : '',
      estadoCivil: estadoCivil[s(data.estadoCivil)] || '',
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento).toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      escolaridad: escolaridad[s(data.escolaridad)] || '',
      noImss: s(data.noImss),
      especialidad: s(data.especialidad),
      contactoEmergencia: s(data.contactoEmergencia),
      numeroContacto: s(data.numeroContacto),
      edadInicioLaboral: s(data.edadInicioLaboral) ? s(data.edadInicioLaboral) + ' años' : '',
      antLaborales: (data.antLaborales || []).map(r => ({
        empresa: r.empresa || '',
        puesto: r.puesto || '',
        tiempo: r.tiempo || '',
      })),
      // agentes: data.agentes || {},
      // agentes: {
      disolventes_tiempo: data.agentes?.['Disolventes']?.tiempo || '',
      disolventes_puesto: data.agentes?.['Disolventes']?.puesto || '',
      pinturas_tiempo: data.agentes?.['Pinturas']?.tiempo || '',
      pinturas_puesto: data.agentes?.['Pinturas']?.puesto || '',
      metales_tiempo: data.agentes?.['Metales']?.tiempo || '',
      metales_puesto: data.agentes?.['Metales']?.puesto || '',
      polvo_tiempo: data.agentes?.['Polvo']?.tiempo || '',
      polvo_puesto: data.agentes?.['Polvo']?.puesto || '',
      sobresfuerzo_tiempo: data.agentes?.['Sobresfuerzo']?.tiempo || '',
      sobresfuerzo_puesto: data.agentes?.['Sobresfuerzo']?.puesto || '',
      ruido_tiempo: data.agentes?.['Ruido']?.tiempo || '',
      ruido_puesto: data.agentes?.['Ruido']?.puesto || '',
      gases_tiempo: data.agentes?.['Gases']?.tiempo || '',
      gases_puesto: data.agentes?.['Gases']?.puesto || '',
      biologicos_tiempo: data.agentes?.['Biológicos']?.tiempo || '',
      biologicos_puesto: data.agentes?.['Biológicos']?.puesto || '',
      tensionales_tiempo: data.agentes?.['Tensionales']?.tiempo || '',
      tensionales_puesto: data.agentes?.['Tensionales']?.puesto || '',
      otros_tiempo: data.agentes?.['Otros']?.tiempo || '',
      otros_puesto: data.agentes?.['Otros']?.puesto || '',
      // },
      antFamiliares: data.antFamiliares || {},
      // antPatologicos: data.antPatologicos || {},
      sifilis: data.antPatologicos?.["Sífilis"]?.["si"] == true ? "SI" : "NO",
      tuberculosis: data.antPatologicos?.["Tuberculosis"]?.["si"] == true ? "SI" : "NO",
      diabetes: data.antPatologicos?.["Diabetes"]?.["si"] == true ? "SI" : "NO",
      hipertension: data.antPatologicos?.["Hipertensión"]?.["si"] == true ? "SI" : "NO",
      cardiopatas: data.antPatologicos?.["Cardiópatas"]?.["si"] == true ? "SI" : "NO",
      renales: data.antPatologicos?.["Renales"]?.["si"] == true ? "SI" : "NO",
      fobias: data.antPatologicos?.["Fobias"]?.["si"] == true ? "SI" : "NO",

      traumaticos: data.antPatologicos?.["Traumáticos"]?.["si"] == true ? "SI" : "NO",
      quirurgicos: data.antPatologicos?.["Quirúrgicos"]?.["si"] == true ? "SI" : "NO",
      epilepticos: data.antPatologicos?.["Epilépticos"]?.["si"] == true ? "SI" : "NO",
      atopicos: data.antPatologicos?.["Atópicos"]?.["si"] == true ? "SI" : "NO",
      lumbalgias: data.antPatologicos?.["Lumbalgias"]?.["si"] == true ? "SI" : "NO",
      vertigo: data.antPatologicos?.["Vértigo"]?.["si"] == true ? "SI" : "NO",
      otros: data.antPatologicos?.["Otros"]?.["si"] == true ? "SI" : "NO",

      // vacunas: data.vacunas || {},
      influenza:   data.vacunas?.["influenza"]?.checked   ? (data.vacunas["influenza"].fecha   || "N/A") : "NO",
      toxoide:     data.vacunas?.["toxoide"]?.checked     ? (data.vacunas["toxoide"].fecha     || "N/A") : "NO",
      hepatitisB:  data.vacunas?.["hepatitisB"]?.checked  ? (data.vacunas["hepatitisB"].fecha  || "N/A") : "NO",
      neumococica: data.vacunas?.["neumococica"]?.checked ? (data.vacunas["neumococica"].fecha || "N/A") : "NO",

      covid1ra:      data.vacunas?.["covid1ra"]?.checked ? "SI" : "NO",
      covid1raFecha: data.vacunas?.["covid1ra"]?.fecha || "",
      covid2da:      data.vacunas?.["covid2da"]?.checked ? "SI" : "NO",
      covid2daFecha: data.vacunas?.["covid2da"]?.fecha || "",
      covidRF:       data.vacunas?.["covidRF"]?.checked  ? "SI" : "NO",
      covidRFFecha:  data.vacunas?.["covidRF"]?.fecha  || "",

      toxicomanias: data.antNoPatologico?.toxicomanias === 'SI' ? 'SI' : (data.antNoPatologico?.toxicomanias === 'NO' ? 'NO' : ''),
      toxicomaniasEsp: s(data.antNoPatologico?.toxicomaniasEsp),
      alcoholismo: data.antNoPatologico?.alcoholismo === 'SI' ? 'SI' : (data.antNoPatologico?.alcoholismo === 'NO' ? 'NO' : ''),
      alcoholismoEsp: s(data.antNoPatologico?.alcoholismoEsp),
      tabaquismo: data.antNoPatologico?.tabaquismo === 'SI' ? 'SI' : (data.antNoPatologico?.tabaquismo === 'NO' ? 'NO' : ''),
      tabaquismoEsp: s(data.antNoPatologico?.tabaquismoEsp),
      menarquia: data.gineco?.menarquia || '',
      ritmo: data.gineco?.ritmo || '',
      papanicolau: data.gineco?.papanicolau || '',
      // fum: data.gineco?.fum || '',
      
      fum: s(data.genero) === "F" && data.gineco?.fum && typeof data.gineco.fum === 'string' ? new Date(data.gineco.fum).toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      dismenorrea: data.gineco?.dismenorrea || '',
      diasDismenorrea: Number(data.gineco?.diasDismenorrea) > 0 ? data.gineco.diasDismenorrea : '',
      gestas: data.gineco?.gestas || '',
      partos: data.gineco?.partos || '',
      cesareas: data.gineco?.cesareas || '',
      abortos: data.gineco?.abortos || '',
      mamas: data.gineco?.mamas || '',
      usg: data.gineco?.usg || '',
      mastografia: data.gineco?.mastografia || '',
      birads: data.gineco?.birads || '',
      incapacidadRiesgo: s(data.incapacidadRiesgo),
      incapacidadEG: s(data.incapacidadEG),
      incapacidadValuacion: s(data.incapacidadValuacion),
      incapacidadComentario: s(data.incapacidadComentario),
      enfermedadActual: s(data.enfermedadActual),
      manoDominanteIzq: s(data.manoDominante) === "IZQ" ? "X" : "",
      manoDominanteDer: s(data.manoDominante) === "DER" ? "X" : "",
      manoDominanteAmb: s(data.manoDominante) === "AMB" ? "X" : "",
      peso: data.vitalSigns?.Peso ? `${data.vitalSigns.Peso} kg` : '',
      talla: data.vitalSigns?.Talla ? `${data.vitalSigns.Talla} m` : '',
      imc: data.vitalSigns?.IMC || '',
      sistolica: data.vitalSigns?.Sistolica || '',
      diastolica: data.vitalSigns?.Diastolica || '',
      fc: data.vitalSigns?.FC || '',
      fr: data.vitalSigns?.FR || '',
      spo2: data.vitalSigns?.SpO2 || data.vitalSigns?.Spo2 || '',

      cabeza_forma: data.expCabeza?.Forma?.valor == "Normal" ? "X" : "",
      cabeza_forma2: data.expCabeza?.Forma?.valor == "Anormal" ? "X" : "",
      cabeza_tamaño: data.expCabeza?.Tamaño?.valor == "Normal" ? "X" : "",
      cabeza_tamaño2: data.expCabeza?.Tamaño?.valor == "Anormal" ? "X" : "",
      cabeza_pelo: data.expCabeza?.Pelo?.valor == "Normal" ? "X" : "",
      cabeza_pelo2: data.expCabeza?.Pelo?.valor == "Anormal" ? "X" : "",
      cabeza_cara: data.expCabeza?.Cara?.valor == "Normal" ? "X" : "",
      cabeza_cara2: data.expCabeza?.Cara?.valor == "Anormal" ? "X" : "",
      
      oidos_cae: data.expOidos?.['C.A.E']?.valor == "Normal" ? "X" : "",
      oidos_cae2: data.expOidos?.['C.A.E']?.valor == "Anormal" ? "X" : "",
      oidos_pabellon: data.expOidos?.['Pabellón']?.valor == "Normal" ? "X" : "",
      oidos_pabellon2: data.expOidos?.['Pabellón']?.valor == "Anormal" ? "X" : "",
      oidos_timpanos: data.expOidos?.['Tímpanos']?.valor == "Normal" ? "X" : "",
      oidos_timpanos2: data.expOidos?.['Tímpanos']?.valor == "Anormal" ? "X" : "",

      ojos_reflejos: data.expOjos?.['Reflejos']?.valor == "Normal" ? "X" : "",
      ojos_reflejos2: data.expOjos?.['Reflejos']?.valor == "Anormal" ? "X" : "",
      ojos_parpados: data.expOjos?.['Párpados']?.valor == "Normal" ? "X" : "",
      ojos_parpados2: data.expOjos?.['Párpados']?.valor == "Anormal" ? "X" : "",
      ojos_pupilas: data.expOjos?.['Pupilas']?.valor == "Normal" ? "X" : "",
      ojos_pupilas2: data.expOjos?.['Pupilas']?.valor == "Anormal" ? "X" : "",
      ojos_conjuntivas: data.expOjos?.['Conjuntivas']?.valor == "Normal" ? "X" : "",
      ojos_conjuntivas2: data.expOjos?.['Conjuntivas']?.valor == "Anormal" ? "X" : "",
      ojos_fondoOjo: data.expOjos?.['Fondo de ojo']?.valor == "Normal" ? "X" : "",
      ojos_fondoOjo2: data.expOjos?.['Fondo de ojo']?.valor == "Anormal" ? "X" : "",
      usaLentes: data.usaLentes == true ? 'SI' : '',
      noUsaLentes: data.usaLentes == false ? 'NO' : '',
      agudezaOD_sinLentes: data.agudezaOD?.sinLentes || '',
      agudezaOD_conLentes: data.agudezaOD?.conLentes || '',
      agudezaOI_sinLentes: data.agudezaOI?.sinLentes || '',
      agudezaOI_conLentes: data.agudezaOI?.conLentes || '',

      boca_mucosas: data.expBoca?.['Mucosas']?.valor == "Normal" ? "X" : "",
      boca_mucosas2: data.expBoca?.['Mucosas']?.valor == "Anormal" ? "X" : "",
      boca_dentadura: data.expBoca?.['Dentadura']?.valor == "Normal" ? "X" : "",
      boca_dentadura2: data.expBoca?.['Dentadura']?.valor == "Anormal" ? "X" : "",
      boca_lengua: data.expBoca?.['Lengua']?.valor == "Normal" ? "X" : "",
      boca_lengua2: data.expBoca?.['Lengua']?.valor == "Anormal" ? "X" : "",
      boca_encias: data.expBoca?.['Encías']?.valor == "Normal" ? "X" : "",
      boca_encias2: data.expBoca?.['Encías']?.valor == "Anormal" ? "X" : "",
      boca_faringe: data.expBoca?.['Faringe']?.valor == "Normal" ? "X" : "",
      boca_faringe2: data.expBoca?.['Faringe']?.valor == "Anormal" ? "X" : "",
      boca_amigdalas: data.expBoca?.['Amígdalas']?.valor == "Normal" ? "X" : "",
      boca_amigdalas2: data.expBoca?.['Amígdalas']?.valor == "Anormal" ? "X" : "",

      nariz_mucosas: data.expNariz?.['Mucosas']?.valor == "Normal" ? "X" : "",
      nariz_mucosas2: data.expNariz?.['Mucosas']?.valor == "Anormal" ? "X" : "",
      nariz_tabique: data.expNariz?.['Tabique']?.valor == "Normal" ? "X" : "",
      nariz_tabique2: data.expNariz?.['Tabique']?.valor == "Anormal" ? "X" : "",

      cuello_ganglios: data.expCuello?.['Ganglios']?.valor == "Normal" ? "X" : "",
      cuello_ganglios2: data.expCuello?.['Ganglios']?.valor == "Anormal" ? "X" : "",
      cuello_ganglios_desc: data.expCuello?.['Ganglios']?.descripcion || "",
      cuello_movilidad: data.expCuello?.['Movilidad']?.valor == "Normal" ? "X" : "",
      cuello_movilidad2: data.expCuello?.['Movilidad']?.valor == "Anormal" ? "X" : "",
      cuello_movilidad_desc: data.expCuello?.['Movilidad']?.descripcion || "",
      
      cuello_tiroides: data.expCuello?.['Tiroides']?.valor == "Normal" ? "X" : "",
      cuello_tiroides2: data.expCuello?.['Tiroides']?.valor == "Anormal" ? "X" : "",
      cuello_tiroides_desc: data.expCuello?.['Tiroides']?.descripcion || "",
      cuello_acantosis: data.expCuello?.['Acantosis']?.valor == "Normal" ? "X" : "",
      cuello_acantosis2: data.expCuello?.['Acantosis']?.valor == "Anormal" ? "X" : "",
      cuello_acantosis_desc: data.expCuello?.['Acantosis']?.descripcion || "",
      cuello_pulsos: data.expCuello?.['Pulsos']?.valor == "Normal" ? "X" : "",
      cuello_pulsos2: data.expCuello?.['Pulsos']?.valor == "Anormal" ? "X" : "",
      cuello_pulsos_desc: data.expCuello?.['Pulsos']?.descripcion || "",

      area_forma: data.expPrecordial?.['Forma']?.valor == "Normal" ? "X" : "",
      area_forma2: data.expPrecordial?.['Forma']?.valor == "Anormal" ? "X" : "",
      area_forma_desc: data.expPrecordial?.['Forma']?.descripcion || "",
      area_ruidos: data.expPrecordial?.['Ruidos Cardiacos']?.valor == "Normal" ? "X" : "",
      area_ruidos2: data.expPrecordial?.['Ruidos Cardiacos']?.valor == "Anormal" ? "X" : "",
      area_ruidos_desc: data.expPrecordial?.['Ruidos Cardiacos']?.descripcion || "",
      area_mamas: data.expPrecordial?.['Mamas']?.valor == "Normal" ? "X" : "",
      area_mamas2: data.expPrecordial?.['Mamas']?.valor == "Anormal" ? "X" : "",
      area_mamas_desc: data.expPrecordial?.['Mamas']?.descripcion || "",
      area_campos: data.expPrecordial?.['Campos pulmonares']?.valor == "Normal" ? "X" : "",
      area_campos2: data.expPrecordial?.['Campos pulmonares']?.valor == "Anormal" ? "X" : "",
      area_campos_desc: data.expPrecordial?.['Campos pulmonares']?.descripcion || "",

      mtor_integridad: data.expMTor?.['Integridad']?.valor == "Normal" ? "X" : "",
      mtor_integridad2: data.expMTor?.['Integridad']?.valor == "Anormal" ? "X" : "",
      mtor_integridad_desc: data.expMTor?.['Integridad']?.descripcion || "",
      mtor_forma: data.expMTor?.['Forma']?.valor == "Normal" ? "X" : "",
      mtor_forma2: data.expMTor?.['Forma']?.valor == "Anormal" ? "X" : "",
      mtor_forma_desc: data.expMTor?.['Forma']?.descripcion || "",
      mtor_articulaciones: data.expMTor?.['Articulaciones']?.valor == "Normal" ? "X" : "",
      mtor_articulaciones2: data.expMTor?.['Articulaciones']?.valor == "Anormal" ? "X" : "",
      mtor_articulaciones_desc: data.expMTor?.['Articulaciones']?.descripcion || "",
      mtor_tono: data.expMTor?.['Tono Muscular']?.valor == "Normal" ? "X" : "",
      mtor_tono2: data.expMTor?.['Tono Muscular']?.valor == "Anormal" ? "X" : "",
      mtor_tono_desc: data.expMTor?.['Tono Muscular']?.descripcion || "",
      mtor_reflejos: data.expMTor?.['Reflejos']?.valor == "Normal" ? "X" : "",
      mtor_reflejos2: data.expMTor?.['Reflejos']?.valor == "Anormal" ? "X" : "",
      mtor_reflejos_desc: data.expMTor?.['Reflejos']?.descripcion || "",
      mtor_sensibilidad: data.expMTor?.['Sensibilidad']?.valor == "Normal" ? "X" : "",
      mtor_sensibilidad2: data.expMTor?.['Sensibilidad']?.valor == "Anormal" ? "X" : "",
      mtor_sensibilidad_desc: data.expMTor?.['Sensibilidad']?.descripcion || "",

      mpel_integridad: data.expMPel?.['Integridad']?.valor == "Normal" ? "X" : "",
      mpel_integridad2: data.expMPel?.['Integridad']?.valor == "Anormal" ? "X" : "",
      mpel_integridad_desc: data.expMPel?.['Integridad']?.descripcion || "",
      mpel_forma: data.expMPel?.['Forma']?.valor == "Normal" ? "X" : "",
      mpel_forma2: data.expMPel?.['Forma']?.valor == "Anormal" ? "X" : "",
      mpel_forma_desc: data.expMPel?.['Forma']?.descripcion || "",
      mpel_articulaciones: data.expMPel?.['Articulaciones']?.valor == "Normal" ? "X" : "",
      mpel_articulaciones2: data.expMPel?.['Articulaciones']?.valor == "Anormal" ? "X" : "",
      mpel_articulaciones_desc: data.expMPel?.['Articulaciones']?.descripcion || "",
      mpel_tono: data.expMPel?.['Tono Muscular']?.valor == "Normal" ? "X" : "",
      mpel_tono2: data.expMPel?.['Tono Muscular']?.valor == "Anormal" ? "X" : "",
      mpel_tono_desc: data.expMPel?.['Tono Muscular']?.descripcion || "",
      mpel_reflejos: data.expMPel?.['Reflejos']?.valor == "Normal" ? "X" : "",
      mpel_reflejos2: data.expMPel?.['Reflejos']?.valor == "Anormal" ? "X" : "",
      mpel_reflejos_desc: data.expMPel?.['Reflejos']?.descripcion || "",
      mpel_sensibilidad: data.expMPel?.['Sensibilidad']?.valor == "Normal" ? "X" : "",
      mpel_sensibilidad2: data.expMPel?.['Sensibilidad']?.valor == "Anormal" ? "X" : "",
      mpel_sensibilidad_desc: data.expMPel?.['Sensibilidad']?.descripcion || "",

      mpel_micosis: data.expMPel?.['Micosis (Si / No)']?.valor == "Normal" ? "X" : "  ",
      mpel_micosis2: data.expMPel?.['Micosis (Si / No)']?.valor == "Anormal" ? "X" : "  ",
      mpel_micosis_desc: data.expMPel?.['Micosis (Si / No)']?.descripcion || "",
      mpel_edemas: data.expMPel?.['Edemas (Si / No)']?.valor == "Normal" ? "X" : "  ",
      mpel_edemas2: data.expMPel?.['Edemas (Si / No)']?.valor == "Anormal" ? "X" : "  ",
      mpel_edemas_desc: data.expMPel?.['Edemas (Si / No)']?.descripcion || "",
      mpel_varices: data.expMPel?.['Varices (Si / No)']?.valor == "Normal" ? "X" : "  ",
      mpel_varices2: data.expMPel?.['Varices (Si / No)']?.valor == "Anormal" ? "X" : "  ",
      mpel_varices_desc: data.expMPel?.['Varices (Si / No)']?.descripcion || "",

      abdo_forma: data.expAbdomen?.['Forma']?.valor == "Normal" ? "X" : "",
      abdo_forma2: data.expAbdomen?.['Forma']?.valor == "Anormal" ? "X" : "",
      abdo_forma_desc: data.expAbdomen?.['Forma']?.descripcion || "",
      abdo_visceromegalias: data.expAbdomen?.['Visceromegalias (Si / No)']?.valor == "Normal" ? "X" : "  ",
      abdo_visceromegalias2: data.expAbdomen?.['Visceromegalias (Si / No)']?.valor == "Anormal" ? "X" : "  ",
      abdo_visceromegalias_desc: data.expAbdomen?.['Visceromegalias (Si / No)']?.descripcion || "",
      abdo_hernias: data.expAbdomen?.['Hernias (Si / No)']?.valor == "Normal" ? "X" : "  ",
      abdo_hernias2: data.expAbdomen?.['Hernias (Si / No)']?.valor == "Anormal" ? "X" : "  ",
      abdo_hernias_desc: data.expAbdomen?.['Hernias (Si / No)']?.descripcion || "",

      gen_fimosis: data.expGenitales?.['Fimosis']?.valor == "Normal" ? "X" : "",
      gen_fimosis2: data.expGenitales?.['Fimosis']?.valor == "Anormal" ? "X" : "",
      gen_fimosis_desc: data.expGenitales?.['Fimosis']?.descripcion || "",
      gen_varicoceles: data.expGenitales?.['Varicoceles']?.valor == "Normal" ? "X" : "",
      gen_varicoceles2: data.expGenitales?.['Varicoceles']?.valor == "Anormal" ? "X" : "",
      gen_varicoceles_desc: data.expGenitales?.['Varicoceles']?.descripcion || "",
      gen_criptorquidia: data.expGenitales?.['Criptorquidia']?.valor == "Normal" ? "X" : "",
      gen_criptorquidia2: data.expGenitales?.['Criptorquidia']?.valor == "Anormal" ? "X" : "",
      gen_criptorquidia_desc: data.expGenitales?.['Criptorquidia']?.descripcion || "",
      gen_hernias: data.expGenitales?.['Hernias']?.valor == "Normal" ? "X" : "",
      gen_hernias2: data.expGenitales?.['Hernias']?.valor == "Anormal" ? "X" : "",
      gen_hernias_desc: data.expGenitales?.['Hernias']?.descripcion || "",

      piel_cicatrices: data.expPiel?.['Cicatrices']?.valor == "Normal" ? "X" : "",
      piel_cicatrices2: data.expPiel?.['Cicatrices']?.valor == "Anormal" ? "X" : "",
      piel_cicatrices_desc: data.expPiel?.['Cicatrices']?.descripcion || "",
      piel_nevos: data.expPiel?.['Nevos']?.valor == "Normal" ? "X" : "",
      piel_nevos2: data.expPiel?.['Nevos']?.valor == "Anormal" ? "X" : "",
      piel_nevos_desc: data.expPiel?.['Nevos']?.descripcion || "",
      piel_vitiligo: data.expPiel?.['Vitíligo']?.valor == "Normal" ? "X" : "",
      piel_vitiligo2: data.expPiel?.['Vitíligo']?.valor == "Anormal" ? "X" : "",
      piel_vitiligo_desc: data.expPiel?.['Vitíligo']?.descripcion || "",

      cerv_integridad: data.expColCervical?.['Integridad']?.valor == "Normal" ? "X" : "",
      cerv_integridad2: data.expColCervical?.['Integridad']?.valor == "Anormal" ? "X" : "",
      cerv_integridad_desc: data.expColCervical?.['Integridad']?.descripcion || "",
      cerv_forma: data.expColCervical?.['Forma']?.valor == "Normal" ? "X" : "",
      cerv_forma2: data.expColCervical?.['Forma']?.valor == "Anormal" ? "X" : "",
      cerv_forma_desc: data.expColCervical?.['Forma']?.descripcion || "",
      cerv_tono: data.expColCervical?.['Tono muscular']?.valor == "Normal" ? "X" : "",
      cerv_tono2: data.expColCervical?.['Tono muscular']?.valor == "Anormal" ? "X" : "",
      cerv_tono_desc: data.expColCervical?.['Tono muscular']?.descripcion || "",
      cerv_sensibilidad: data.expColCervical?.['Sensibilidad']?.valor == "Normal" ? "X" : "",
      cerv_sensibilidad2: data.expColCervical?.['Sensibilidad']?.valor == "Anormal" ? "X" : "",
      cerv_sensibilidad_desc: data.expColCervical?.['Sensibilidad']?.descripcion || "",
      cerv_fuerza: data.expColCervical?.['Fuerza']?.valor == "Normal" ? "X" : "",
      cerv_fuerza2: data.expColCervical?.['Fuerza']?.valor == "Anormal" ? "X" : "",
      cerv_fuerza_desc: data.expColCervical?.['Fuerza']?.descripcion || "",

      lumb_integridad: data.expColLumbar?.['Integridad']?.valor == "Normal" ? "X" : "",
      lumb_integridad2: data.expColLumbar?.['Integridad']?.valor == "Anormal" ? "X" : "",
      lumb_integridad_desc: data.expColLumbar?.['Integridad']?.descripcion || "",
      lumb_forma: data.expColLumbar?.['Forma']?.valor == "Normal" ? "X" : "",
      lumb_forma2: data.expColLumbar?.['Forma']?.valor == "Anormal" ? "X" : "",
      lumb_forma_desc: data.expColLumbar?.['Forma']?.descripcion || "",
      lumb_tono: data.expColLumbar?.['Tono muscular']?.valor == "Normal" ? "X" : "",
      lumb_tono2: data.expColLumbar?.['Tono muscular']?.valor == "Anormal" ? "X" : "",
      lumb_tono_desc: data.expColLumbar?.['Tono muscular']?.descripcion || "",
      lumb_sensibilidad: data.expColLumbar?.['Sensibilidad']?.valor == "Normal" ? "X" : "",
      lumb_sensibilidad2: data.expColLumbar?.['Sensibilidad']?.valor == "Anormal" ? "X" : "",
      lumb_sensibilidad_desc: data.expColLumbar?.['Sensibilidad']?.descripcion || "",
      lumb_fuerza: data.expColLumbar?.['Fuerza']?.valor == "Normal" ? "X" : "",
      lumb_fuerza2: data.expColLumbar?.['Fuerza']?.valor == "Anormal" ? "X" : "",
      lumb_fuerza_desc: data.expColLumbar?.['Fuerza']?.descripcion || "",

      // rx_torax: data.expRadiografia?.['R. Tórax']?.valor || '',
      rx_columna_ap: data.expRadiografia?.['Columna AP']?.valor == "Normal" ? "X" : "",
      rx_columna_ap2: data.expRadiografia?.['Columna AP']?.valor == "Anormal" ? "X" : "",
      rx_lateral: data.expRadiografia?.['Lateral']?.valor == "Normal" ? "X" : "",
      rx_lateral2: data.expRadiografia?.['Lateral']?.valor == "Anormal" ? "X" : "",
      hallazgos_lordosis: data.expHallazgos?.['Lordosis']?.valor == "Normal" ? "X" : "  ",
      hallazgos_lordosis2: data.expHallazgos?.['Lordosis']?.valor == "Anormal" ? "X" : "  ",
      hallazgos_escoliosis: data.expHallazgos?.['Escoliosis']?.valor == "Normal" ? "X" : "  ",
      hallazgos_escoliosis2: data.expHallazgos?.['Escoliosis']?.valor == "Anormal" ? "X" : "  ",

      lab_bh: data.labs?.bh || '',
      lab_hto: data.labs?.hto || '',
      lab_gr: data.labs?.gr || '',
      lab_gb: data.labs?.gb || '',
      lab_plaq: data.labs?.plaq || '',
      lab_glucosa: data.labs?.glucosa || '',
      lab_colesterol: data.labs?.colesterol || '',
      lab_trigliceridos: data.labs?.trigliceridos || '',
      lab_urea: data.labs?.urea || '',
      lab_acUrico: data.labs?.acUrico || '',

      antidoping: data.expHallazgos?.['Antidoping']?.valor == "Normal" ? "X" : "  ",
      antidoping2: data.expHallazgos?.['Antidoping']?.valor == "Anormal" ? "X" : "  ",
      audiometria: data.expGabinete?.['Audiometría']?.valor == "Normal" ? "X" : "  ",
      audiometria2: data.expGabinete?.['Audiometría']?.valor == "Anormal" ? "X" : "  ",
      audiometria_desc: data.expGabinete?.['Audiometría']?.descripcion || '',
      ekg: data.expGabinete?.['Ekg']?.valor == "Normal" ? "X" : "  ",
      ekg2: data.expGabinete?.['Ekg']?.valor == "Anormal" ? "X" : "  ",
      ekg_desc: data.expGabinete?.['Ekg']?.descripcion || '',
      fitTest: data.expGabinete?.['Fit Test']?.valor == "Normal" ? "X" : "  ",
      fitTest2: data.expGabinete?.['Fit Test']?.valor == "Anormal" ? "X" : "  ",
      fitTest_desc: data.expGabinete?.['Fit Test']?.descripcion || '',
      espirometria: data.expGabinete?.['Espirómetria']?.valor == "Normal" ? "X" : "  ",
      espirometria2: data.expGabinete?.['Espirómetria']?.valor == "Anormal" ? "X" : "  ",
      espirometria_desc: data.expGabinete?.['Espirómetria']?.descripcion || '',

      diagnostico1: data.conclusiones?.diagnostico1 || '',
      diagnostico2: data.conclusiones?.diagnostico2 || '',
      diagnostico3: data.conclusiones?.diagnostico3 || '',
      diagnostico4: data.conclusiones?.diagnostico4 || '',
      recomendacion1: data.conclusiones?.recomendacion1 || '',
      recomendacion2: data.conclusiones?.recomendacion2 || '',
      recomendacion3: data.conclusiones?.recomendacion3 || '',
      // resultado: data.conclusiones?.resultado || '',
      gradoSalud: data.conclusiones?.gradoSalud || '',
      observaciones: data.conclusiones?.observaciones || '',
    };

    try {
      doc.render(docData);
    } catch (err) {
      throw new Error(`Error al renderizar plantilla: ${err.message}`);
    }

    // 5. Generar buffer DOCX
    const docBytes = doc.getZip().generate({ type: 'nodebuffer' });
    return docBytes;

  } catch (err) {
    console.error('Error generando DOCX con template:', err);
    throw err;
  }
}

/**
 * Convertir DOCX a PDF (requiere LibreOffice o similiar instalado)
 */
// async function convertirDocxAPdf(docxBuffer) {
//   const tempDir = os.tmpdir();
//   const fileId = Date.now();

//   const docxPath = path.join(tempDir, `temp_${fileId}.docx`);
//   const pdfPath = path.join(tempDir, `temp_${fileId}.pdf`);

//   fs.writeFileSync(docxPath, docxBuffer);

//   execSync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`);

//   if (!fs.existsSync(pdfPath)) {
//     throw new Error('No se generó el PDF');
//   }

//   const pdfBuffer = fs.readFileSync(pdfPath);

//   // limpiar
//   fs.unlinkSync(docxPath);
//   fs.unlinkSync(pdfPath);

//   return pdfBuffer;
// }

module.exports = { generarHistoriaClinicaDocx };