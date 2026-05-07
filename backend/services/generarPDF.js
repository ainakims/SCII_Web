'use strict';

const pdfmake = require('pdfmake');
pdfmake.addFonts(require('pdfmake/standard-fonts/Helvetica'));
pdfmake.setUrlAccessPolicy(() => true);

const W1  = [71, 92, 85, 25, 32, 241];
const W2  = [163, 234, 149];
const W3  = [82, 74, 84, 87, 85, 135];
const W4  = [170, 78, 79, 81, 41, 94];
const W5  = [110, 47, 110, 57, 84, 43, 45, 40];
const W6  = [122, 63, 89, 245];
const W7  = [77, 45, 117, 72, 71, 136];
const W8  = [123, 59, 47, 65, 80, 64];
const W9  = [66, 50, 63, 87, 78, 175];
const W10 = [99, 63, 70, 101, 66, 41, 78];
const W11 = [78, 50, 56, 94, 54, 184];
const W12 = [76, 52, 56, 331];
const W13 = [126, 52, 56, 247];
const W18 = [126, 28, 24, 54, 1, 20, 57, 21, 71, 80, 1];
const W19 = [78, 78, 102, 5, 69, 23, 52, 75];
const W20 = [119, 113, 6, 67, 52, 119];

const v    = (x) => (x != null && x !== '' && x !== false) ? String(x) : '';
const vd   = (x) => v(x) || '—';
const yn   = (x) => (x === true || x === 'true' || x === 'SI') ? 'SI' : (x === false || x === 'false' || x === 'NO') ? 'NO' : '';
const nVal = (sec, f) => sec?.[f]?.valor       || '';
const nDes = (sec, f) => sec?.[f]?.descripcion || '';
const sz11 = { fontSize: 11 };
const sz10 = { fontSize: 10 };
const sz8  = { fontSize: 8 };
const bold = { bold: true };

const tc    = (txt, opts = {}) => ({ text: String(txt ?? ''), ...opts });
const th    = (txt, opts = {}) => tc(txt, { bold: true, ...opts });
const empty = () => ({});
const pad   = (n) => Array(n).fill({});

const tbl = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5,
  hLineColor: () => 'black', vLineColor: () => 'black',
  paddingLeft: () => 3, paddingRight: () => 3,
  paddingTop: () => 2, paddingBottom: () => 2,
};

const exploRow = (label, sec, field) => {
  const val = nVal(sec, field);
  return [
    tc(label, sz11),
    tc(val === 'Normal'  ? '✓' : '', { ...sz11, alignment: 'center' }),
    tc(val === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }),
    tc(nDes(sec, field), sz11),
  ];
};

const secHeading = (txt) => ({ text: txt, bold: true, fontSize: 11, margin: [0, 8, 0, 0] });

function tblFicha(d) {
  return {
    table: {
      widths: W1,
      body: [
        [th(['MATRICULA :  ', tc(vd(d.matricula))], { colSpan: 3, ...sz11 }), ...pad(2), th(['FECHA:  ', tc(vd(d.fechaEval))], { colSpan: 3, ...sz11 }), ...pad(2)],
        [th(['NOMBRE DEL TRABAJADOR:  ', tc(vd(d.nombre))], { colSpan: 6, ...sz11 }), ...pad(5)],
        [
          th(['EDAD:  ', tc(vd(d.edad))], sz11),
          th(['GENERO:  ', tc(vd(d.genero === 'F' ? 'Femenino' : d.genero === 'M' ? 'Masculino' : d.genero))], sz11),
          th(['ESTADO CIVIL:  ', tc(vd(d.estadoCivil))], { colSpan: 3, ...sz11 }), ...pad(2),
          th(['FECHA DE NACIMIENTO:  ', tc(vd(d.fechaNacimiento))], sz11),
        ],
        [th(['ESCOLARIDAD:  ', tc(vd(d.escolaridad))], { colSpan: 4, ...sz11 }), ...pad(3), th(['NO.IMSS:  ', tc(vd(d.noImss))], { colSpan: 2, ...sz11 }), ...pad(1)],
        [th(['PUESTO AL QUE ASPIRA:  ', tc(vd(d.puestoAspira))], { colSpan: 4, ...sz11 }), ...pad(3), th(['CONTACTO DE EMERGENCIA:  ', tc(vd(d.contactoEmergencia) + (d.numeroContacto ? '  Tel: ' + d.numeroContacto : ''))], { colSpan: 2, ...sz11 }), ...pad(1)],
      ],
    },
    layout: tbl,
  };
}

function tblLaboralBasico(d) {
  return {
    table: { widths: W2, body: [[th('EDAD DE INICIO DE ACTIVIDAD LABORAL', { colSpan: 2, ...sz11 }), empty(), tc(v(d.edadInicioLaboral) ? v(d.edadInicioLaboral) + ' años' : '', sz11)]] },
    layout: tbl, margin: [0, 0, 0, 0],
  };
}

function tblLaboralEmpresas(d) {
  const labs = (d.antLaborales || []).filter(r => r.empresa || r.puesto || r.tiempo);
  const rows = labs.length ? labs : [{ empresa: '', puesto: '', tiempo: '' }];
  return {
    table: { widths: W2, body: [[th('EMPRESA', sz11), th('PUESTO', sz11), th('TIEMPO QUE TRABAJÓ', sz11)], ...rows.map(r => [tc(v(r.empresa), sz11), tc(v(r.puesto), sz11), tc(v(r.tiempo), sz11)])] },
    layout: tbl, margin: [0, 0, 0, 0],
  };
}

function tblAgentes(d) {
  const ag  = d.agentes || {};
  const izq = ['Disolventes', 'Pinturas', 'Metales', 'Polvo', 'Sobresfuerzo'];
  const der = ['Ruido', 'Gases', 'Biológicos', 'Tensionales', 'Otros'];
  return {
    table: {
      widths: W3,
      body: [
        [th('EXPOSICIÓN A AGENTES EN EL TRABAJO', { colSpan: 6, ...sz11 }), ...pad(5)],
        [th('AGENTE', sz11), th('TIEMPO EXPOSICIÓN', sz11), th('PUESTO', sz11), th('AGENTE', sz11), th('TIEMPO EXPOSICIÓN', sz11), th('PUESTO', sz11)],
        ...izq.map((a, i) => [tc(a, sz11), tc(v(ag[a]?.tiempo), sz11), tc(v(ag[a]?.puesto), sz11), tc(der[i] || '', sz11), tc(v(ag[der[i]]?.tiempo), sz11), tc(v(ag[der[i]]?.puesto), sz11)]),
      ],
    },
    layout: tbl, margin: [0, 0, 0, 0],
  };
}

function tblFamiliar(d) {
  // antFamiliares puede ser array [{enfermedad, abuelos, padres, hermanos, hijos, otros}]
  // o el objeto legacy {Tuberculosis:{abuelos,...},...}
  const enfs = ['Tuberculosis','Sífilis','Hipertensión','Diabetes','Cardiópatas','Epilépticos','Oncológicos','Malformaciones congénitas','Otros'];
  let rows;
  if (Array.isArray(d.antFamiliares)) {
    rows = d.antFamiliares;
  } else {
    const af = d.antFamiliares || {};
    rows = enfs.map(e => ({ enfermedad: e, abuelos: af[e]?.abuelos || '', padres: af[e]?.padres || '', hermanos: af[e]?.hermanos || '', hijos: af[e]?.hijos || '', otros: af[e]?.otros || '' }));
  }
  return {
    table: {
      widths: W4,
      body: [
        [th('ANTECEDENTE', sz11), th('Abuelos', sz11), th('Padres', sz11), th('Hermanos', sz11), th('Hijos', sz11), th('Otros', sz11)],
        ...rows.map(r => [
          tc(r.enfermedad || '', sz11),
          tc(v(r.abuelos),  { ...sz11, alignment: 'center' }),
          tc(v(r.padres),   { ...sz11, alignment: 'center' }),
          tc(v(r.hermanos), { ...sz11, alignment: 'center' }),
          tc(v(r.hijos),    { ...sz11, alignment: 'center' }),
          tc(v(r.otros),    { ...sz11, alignment: 'center' }),
        ]),
      ],
    },
    layout: tbl,
  };
}

function tblPatologico(d) {
  const ap  = d.antPatologicos || {};
  const vac = d.vacunas        || {};
  const condL = ['Sífilis','Tuberculosis','Diabetes','Hipertensión','Cardiópatas','Renales','Fobias','Traumáticos'];
  const condR = ['Traumáticos','Quirúrgicos','Epilépticos','Atópicos','Lumbalgias','','',''];
  const vacR  = [['Influenza', yn(vac.influenza)], ['Toxoide', yn(vac.toxoide)], ['Hepatitis B', yn(vac.hepatitisB)], ['Neumocócica', yn(vac.neumococica)]];
  const covidRow = [yn(vac.covid1ra), yn(vac.covid2da), yn(vac.covidRF)];
  const buildRow = (i) => {
    const lbl = condL[i] || '';
    const si  = ap[lbl]?.si;
    const vRow = vacR[i];
    const rightCells = vRow
      ? [tc(vRow[0], sz11), tc(vRow[1] || '', { ...sz11, alignment: 'center' }), empty(), empty()]
      : i === 4
        ? [tc('Covid 19', sz11), tc('1ra: ' + (covidRow[0] || ''), sz8), tc('2da: ' + (covidRow[1] || ''), sz8), tc('RF: ' + (covidRow[2] || ''), sz8)]
        : [empty(), empty(), empty(), empty()];
    return [tc(lbl, sz11), tc(si ? 'SI' : (si === false ? 'NO' : ''), { ...sz11, alignment: 'center' }), tc(condR[i] || '', sz11), tc(ap[condR[i]]?.si ? 'SI' : (condR[i] && ap[condR[i]]?.si === false ? 'NO' : ''), { ...sz11, alignment: 'center' }), ...rightCells];
  };
  return {
    table: {
      widths: W5,
      body: [[th('ANTECEDENTE', sz11), th('SI/NO', sz11), th('ANTECEDENTE', sz11), th('SI/NO', sz11), th('Esquema de Vacunación', { colSpan: 4, ...sz11 }), ...pad(3)], ...Array.from({ length: 8 }, (_, i) => buildRow(i))],
    },
    layout: tbl,
  };
}

function tblNoPatologico(d) {
  const np = d.antNoPatologico || {};
  return {
    table: {
      widths: W6,
      body: [
        [tc('Toxicomanías', sz11), tc(yn(np.toxicomanias), { ...sz11, alignment: 'center' }), th('Especifique:', sz11), tc(v(np.toxicomaniasEsp), sz11)],
        [tc('Alcoholismo',  sz11), tc(yn(np.alcoholismo),  { ...sz11, alignment: 'center' }), th('Especifique:', sz11), tc(v(np.alcoholismoEsp),  sz11)],
        [tc('Tabaquismo',   sz11), tc(yn(np.tabaquismo),   { ...sz11, alignment: 'center' }), th('Especifique:', sz11), tc(v(np.tabaquismoEsp),   sz11)],
      ],
    },
    layout: tbl,
  };
}

function tblGineco(d) {
  const g = d.gineco || {};
  if (d.genero !== 'F') {
    return { table: { widths: ['*'], body: [[tc('No aplica (género Masculino)', { ...sz11, italics: true, alignment: 'center' })]] }, layout: tbl };
  }
  return {
    table: {
      widths: W7,
      body: [
        [th('Menarquia:', sz10), tc(v(g.menarquia), sz10), th('Ritmo, especifique:', sz10), tc(v(g.ritmo), sz10), th('PAPANICOLAU:', { colSpan: 2, ...sz10 }), empty()],
        [th('FUM', sz10), tc(v(g.fum), sz10), th('Dismenorrea:', sz10), th('Incapacitante:', { colSpan: 2, ...sz10 }), empty(), th('Días:', sz10)],
        [empty(), empty(), empty(), tc(v(g.incapacitante), sz10), empty(), tc(v(g.diasDismenorrea), sz10)],
        [th('Gestas:', sz10), tc(v(g.gestas), sz10), th('Partos:', sz10), th('Cesáreas:', { colSpan: 2, ...sz10 }), empty(), th('Abortos:', sz10)],
        [empty(), empty(), empty(), tc(v(g.partos), sz10), empty(), tc(v(g.abortos), sz10)],
        [th('Mamas', sz10), th('USG:', sz10), tc(v(g.usg), sz10), th('MASTOGRAFÍA:', { colSpan: 2, ...sz10 }), empty(), th('Birads:', sz10)],
        [tc(v(g.mamas), sz10), empty(), empty(), tc(v(g.mastografia), sz10), empty(), tc(v(g.birads), sz10)],
        [th('PAPANICOLAU (resultado):', { colSpan: 3, ...sz10 }), ...pad(2), tc(v(g.papanicolau), { colSpan: 3, ...sz10 }), ...pad(2)],
      ],
    },
    layout: tbl,
  };
}

function tblIncapacidad(d) {
  const hand = d.manoDominante || '';
  const handText = [{ text: 'Derecha    ', bold: hand === 'Derecha' }, { text: 'Izquierda    ', bold: hand === 'Izquierda' }, { text: 'Ambidiestro', bold: hand === 'Ambidiestro' }];
  return {
    table: {
      widths: [140, '*', 80, '*'],
      body: [
        [th('7. Por riesgo de trabajo:', sz11), tc(vd(d.incapacidadRiesgo), sz11), th('Valuación:', sz11), tc(vd(d.incapacidadValuacion), sz11)],
        [th('8. Por enfermedad general:', sz11), tc(vd(d.incapacidadEG), sz11), th('Comentario:', sz11), tc(vd(d.incapacidadComentario), sz11)],
        [th('9. ¿Padece alguna enfermedad actualmente?', sz11), { text: vd(d.enfermedadActual), colSpan: 3, ...sz11 }, ...pad(2)],
        [th('Mano dominante:', sz11), { text: handText, colSpan: 3, ...sz11 }, ...pad(2)],
      ],
    },
    layout: tbl,
  };
}

function tblVitales(d) {
  const vs = d.vitalSigns || {};
  return {
    table: {
      widths: W8,
      body: [
        [th('Peso', sz11), th('Talla', sz11), th('IMC', sz11), th('PA', { colSpan: 2, ...sz11 }), empty(), th('Spo2', sz11)],
        [tc(v(vs.Peso) ? v(vs.Peso) + ' kg' : '', sz11), tc(v(vs.Talla) ? v(vs.Talla) + ' m' : '', sz11), tc(v(vs.IMC), sz11), th('T/A', sz11), tc(v(vs.Sistolica) && v(vs.Diastolica) ? v(vs.Sistolica) + '/' + v(vs.Diastolica) : '', sz11), tc(v(vs.SpO2) || v(vs.Spo2), sz11)],
        [{ text: '', colSpan: 2 }, empty(), th('FC', sz11), th('FR', { colSpan: 2, ...sz11 }), empty(), empty()],
        [{ text: '', colSpan: 2 }, empty(), tc(v(vs.FC), sz11), tc(v(vs.FR), { colSpan: 2, ...sz11 }), empty(), empty()],
      ],
    },
    layout: tbl,
  };
}

function tblCabezaOidos(d) {
  const cabezaFields = ['Forma', 'Tamaño', 'Pelo', 'Cara'];
  const oidosFields  = ['C.A.E', 'Pabellón', 'Tímpanos', 'Descripción'];
  return {
    table: {
      widths: W9,
      body: [
        [th('CABEZA', sz11), th('Normal', sz11), th('Anormal', sz11), th('OIDOS', sz11), th('Normal', sz11), th('Anormal', sz11)],
        ...Array.from({ length: 4 }, (_, i) => {
          const cf = cabezaFields[i]; const of = oidosFields[i];
          const cv = nVal(d.expCabeza, cf); const ov = nVal(d.expOidos, of);
          return [tc(cf || '', sz11), tc(cv === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(cv === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(of || '', sz11), tc(ov === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(ov === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' })];
        }),
      ],
    },
    layout: tbl,
  };
}

function tblOjos(d) {
  const ojosFields = ['Reflejos', 'Párpados', 'Pupilas', 'Conjuntivas', 'Fondo de ojo'];
  const avOD = d.agudezaOD || {}; const avOI = d.agudezaOI || {};
  const rows = ojosFields.map((f, i) => {
    const val = nVal(d.expOjos, f);
    const right = i === 0 ? [th('Ojo derecho', { colSpan: 4, ...sz11 }), ...pad(3)]
      : i === 1 ? [tc('', sz11), th('Sin lentes:', sz11), tc(v(avOD.sinLentes), sz11), th('Con lentes:', sz11)]
      : i === 2 ? [tc('', sz11), tc('', sz11), tc(v(avOD.conLentes), sz11), tc('', sz11)]
      : i === 3 ? [th('Ojo izquierdo:', { colSpan: 4, ...sz11 }), ...pad(3)]
      : [tc('', sz11), th('Sin lentes:', sz11), tc(v(avOI.sinLentes), sz11), th('Con lentes:', sz11)];
    return [tc(f, sz11), tc(val === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(val === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), ...right];
  });
  return {
    table: {
      widths: W10,
      body: [[th('OJOS', sz11), th('Normal', sz11), th('Anormal', sz11), th('Agudeza visual.', sz11), th('Usa lentes:', sz11), tc(d.usaLentes === true ? 'SI' : d.usaLentes === false ? 'NO' : '', { ...sz11, alignment: 'center' }), tc('', sz11)], ...rows],
    },
    layout: tbl,
  };
}

function tblBocaNariz(d) {
  const bocaF  = ['Mucosas', 'Dentadura', 'Lengua', 'Encías', 'Faringe', 'Amígdalas'];
  const narizF = ['Mucosas', 'Tabique', 'Describa', '', '', ''];
  return {
    table: {
      widths: W11,
      body: [
        [th('Boca', sz11), th('Normal', sz11), th('Anormal', sz11), th('Nariz', sz11), th('Normal', sz11), th('Anormal', sz11)],
        ...Array.from({ length: 6 }, (_, i) => {
          const bv = nVal(d.expBoca, bocaF[i]); const nv = nVal(d.expNariz, narizF[i] || '');
          return [tc(bocaF[i] || '', sz11), tc(bv === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(bv === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(narizF[i] || '', sz11), tc(nv === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nv === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' })];
        }),
      ],
    },
    layout: tbl,
  };
}

function tblExplo4(titulo, campos, sec, widths) {
  return { table: { widths: widths || W13, body: [[th(titulo, sz11), th('Normal', sz11), th('Anormal', sz11), th('Descripción', sz11)], ...campos.map(f => exploRow(f, sec, f))] }, layout: tbl };
}

function tblGenitalesPielColumnas(d) {
  const genitalesF = ['Fimosis', 'Varicoceles', 'Criptorquidia', 'Hernias'];
  const pielF      = ['Cicatrices', 'Nevos', 'Vitíligo'];
  const colCervF   = ['Integridad', 'Forma', 'Tono muscular', 'Sensibilidad', 'Fuerza'];
  const colLumbF   = ['Integridad', 'Forma', 'Tono muscular', 'Sensibilidad', 'Fuerza'];
  const siNo = (sec, f) => { const val = nVal(sec, f); return val === 'Normal' ? 'Si' : val === 'Anormal' ? 'No' : ''; };
  return {
    table: {
      widths: W13,
      body: [
        [th('Genitales', sz11), th('Si', sz11), th('No', sz11), th('Descripción', sz11)],
        ...genitalesF.map(f => [tc(f, sz11), tc(siNo(d.expGenitales, f), { ...sz11, alignment: 'center' }), tc('', sz11), tc(nDes(d.expGenitales, f), sz11)]),
        [th('Piel y anexos', sz11), tc('', sz11), tc('', sz11), tc('', sz11)],
        ...pielF.map(f => exploRow(f, d.expPiel, f)),
        [th('Columna Cervical y dorsal', sz11), th('Normal', sz11), th('Anormal', sz11), th('Descripción', sz11)],
        ...colCervF.map(f => exploRow(f, d.expColCervical, f)),
        [th('Columna Lumbar', sz11), th('Normal', sz11), th('Anormal', sz11), th('Descripción', sz11)],
        ...colLumbF.map(f => exploRow(f, d.expColLumbar, f)),
      ],
    },
    layout: tbl,
  };
}

function tblRadiografia(d) {
  const rx = d.expRadiografia || {}; const hall = d.expHallazgos || {};
  return {
    table: {
      widths: W18,
      body: [
        [th('Rx. Tórax', { colSpan: 2, ...sz11 }), empty(), th('Normal', { colSpan: 2, ...sz11 }), empty(), th('Anormal', sz11), empty(), th('Descripción anormalidad', { colSpan: 4, ...sz11 }), ...pad(3), empty()],
        [empty(), empty(), empty(), empty(), empty(), empty(), empty(), tc(nVal(rx, 'R. Tórax') === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), empty(), tc(nVal(rx, 'R. Tórax') === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), empty()],
        [th('Columna AP', { colSpan: 2, ...sz11 }), empty(), tc(nVal(rx, 'Columna AP') === 'Normal' ? '✓' : '', { colSpan: 2, ...sz11, alignment: 'center' }), empty(), tc(nVal(rx, 'Columna AP') === 'Anormal' ? '✓' : '', sz11), empty(), empty(), empty(), empty(), empty(), empty()],
        [th('Lateral', { colSpan: 2, ...sz11 }), empty(), tc(nVal(rx, 'Lateral') === 'Normal' ? '✓' : '', { colSpan: 2, ...sz11, alignment: 'center' }), empty(), tc(nVal(rx, 'Lateral') === 'Anormal' ? '✓' : '', sz11), empty(), empty(), empty(), empty(), empty(), empty()],
        [tc('Lordosis', sz11), tc(nVal(hall, 'Lordosis') ? 'Si' : '', { colSpan: 2, ...sz11 }), empty(), tc(nVal(hall, 'Lordosis') ? '' : 'No', { colSpan: 2, ...sz11 }), empty(), empty(), empty(), empty(), empty(), empty(), empty()],
        [tc('Escoliosis', sz11), tc(nVal(hall, 'Escoliosis') ? 'Si' : '', { colSpan: 2, ...sz11 }), empty(), tc(nVal(hall, 'Escoliosis') ? '' : 'No', { colSpan: 2, ...sz11 }), empty(), empty(), empty(), empty(), empty(), empty(), empty()],
      ],
    },
    layout: tbl,
  };
}

function tblLaboratorio(d) {
  const labs = d.labs || {};
  return {
    table: {
      widths: W19,
      body: [
        [th('BH', sz11), th('HTO', sz11), th('GR', { colSpan: 2, ...sz11 }), empty(), th('GB', { colSpan: 2, ...sz11 }), empty(), th('PLAQ', { colSpan: 2, ...sz11 }), empty()],
        [tc(v(labs.bh), sz11), tc(v(labs.hto), sz11), tc(v(labs.gr), { colSpan: 2, ...sz11 }), empty(), tc(v(labs.gb), { colSpan: 2, ...sz11 }), empty(), tc(v(labs.plaq), { colSpan: 2, ...sz11 }), empty()],
        [th('Glucosa', sz11), tc(v(labs.glucosa), sz11), th('Colesterol', sz11), tc(v(labs.colesterol), { colSpan: 2, ...sz11 }), empty(), th('Triglicéridos', { colSpan: 2, ...sz11 }), empty(), tc(v(labs.trigliceridos), sz11)],
        [th('Urea', sz11), tc(v(labs.urea), sz11), th('Ac. Úrico', sz11), tc(v(labs.acUrico), { colSpan: 2, ...sz11 }), empty(), tc('', { colSpan: 2 }), empty(), empty()],
        [th('Antidoping', sz11), tc(nVal(d.expHallazgos, 'Antidoping') === 'Normal' ? 'Positivo ✓' : 'Positivo', sz11), tc(nVal(d.expHallazgos, 'Antidoping') === 'Anormal' ? 'Negativo ✓' : 'Negativo', sz11), ...pad(5)],
        [th('Audiometría', sz11), tc(nVal(d.expGabinete, 'Audiometría') === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nVal(d.expGabinete, 'Audiometría') === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), th('Descripción', { colSpan: 5, ...sz11 }), ...pad(4)],
        [empty(), empty(), empty(), tc(nDes(d.expGabinete, 'Audiometría'), { colSpan: 5, ...sz11 }), ...pad(4)],
        [th('Ekg', sz11), tc(nVal(d.expGabinete, 'Ekg') === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nVal(d.expGabinete, 'Ekg') === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nDes(d.expGabinete, 'Ekg'), { colSpan: 5, ...sz11 }), ...pad(4)],
        [th('Fit Test', sz11), tc(nVal(d.expGabinete, 'Fit Test') === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nVal(d.expGabinete, 'Fit Test') === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nDes(d.expGabinete, 'Fit Test'), { colSpan: 5, ...sz11 }), ...pad(4)],
        [th('Espirómetria', sz11), tc(nVal(d.expGabinete, 'Espirómetria') === 'Normal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nVal(d.expGabinete, 'Espirómetria') === 'Anormal' ? '✓' : '', { ...sz11, alignment: 'center' }), tc(nDes(d.expGabinete, 'Espirómetria'), { colSpan: 5, ...sz11 }), ...pad(4)],
      ],
    },
    layout: tbl,
  };
}

function tblConclusiones(d) {
  const c = d.conclusiones || {};
  const resultado = c.resultado || '';
  return {
    table: {
      widths: W20,
      body: [
        [th('Diagnósticos', sz10), tc(vd(c.diagnostico1), sz10), tc('2.', { ...sz10, ...bold }), tc(vd(c.diagnostico2), { colSpan: 3, ...sz10 }), ...pad(2)],
        [tc('3.', { ...sz10, ...bold }), tc(vd(c.diagnostico3), sz10), tc('', sz10), tc(vd(c.diagnostico4), { colSpan: 3, ...sz10 }), ...pad(2)],
        [th('Recomendaciones:', sz10), tc(vd(c.recomendacion1), { colSpan: 5, ...sz10 }), ...pad(4)],
        [tc('2', { ...sz10, ...bold }), tc(vd(c.recomendacion2), { colSpan: 5, ...sz10 }), ...pad(4)],
        [tc('3', { ...sz10, ...bold }), tc(vd(c.recomendacion3), { colSpan: 5, ...sz10 }), ...pad(4)],
        [th('Resultado', sz10), tc((resultado.toLowerCase() === 'satisfactorio' ? '● ' : '○ ') + 'satisfactorio', sz10), { text: (resultado.toLowerCase() === 'no satisfactorio' ? '● ' : '○ ') + 'No satisfactorio', colSpan: 2, ...sz10 }, {}, { text: (resultado.toLowerCase() === 'incompleto' ? '● ' : '○ ') + 'Incompleto', colSpan: 2, ...sz10 }, {}],
        [th('Grado de salud', sz10), { text: vd(c.gradoSalud || c.resultado), colSpan: 5, ...sz10 }, ...pad(4)],
        [th('Observaciones', sz10), { text: v(c.observaciones) || '\n\n', colSpan: 5, ...sz10 }, ...pad(4)],
        [{ text: 'Firma del médico', colSpan: 3, ...sz10, ...bold, alignment: 'center' }, ...pad(2), { text: 'Fecha   ─────────────────', colSpan: 3, ...sz10, ...bold }, ...pad(2)],
        [{ text: '\n\nDra. María Susana Aguileta Roquet', colSpan: 3, ...sz10, alignment: 'center' }, ...pad(2), { text: '\n\n', colSpan: 3 }, ...pad(2)],
        [{ text: '_____________________________', colSpan: 3, ...sz10, alignment: 'center' }, ...pad(2), { text: '_____________________________', colSpan: 3, ...sz10, alignment: 'center' }, ...pad(2)],
        [{ text: 'Firma del Empleado ENTERADO del Resultado de EVALUACIÓN MÉDICA', colSpan: 3, ...sz8, alignment: 'center' }, ...pad(2), { text: 'Número telefónico del empleado', colSpan: 3, ...sz8, alignment: 'center' }, ...pad(2)],
      ],
    },
    layout: tbl,
  };
}

async function generarPDF(data) {
  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [34, 35, 33, 35],
    defaultStyle: { font: 'Helvetica', fontSize: 11, lineHeight: 1.15 },
    content: [
      secHeading('1. FICHA DE IDENTIFICACIÓN'),    tblFicha(data),
      secHeading('2. ANTECEDENTES LABORALES'),      tblLaboralBasico(data), tblLaboralEmpresas(data), tblAgentes(data),
      secHeading('3. ANTECEDENTES FAMILIARES'),     tblFamiliar(data),
      secHeading('4. ANTECEDENTES PERSONALES PATOLÓGICOS'), tblPatologico(data),
      secHeading('5. ANTECEDENTES PERSONALES NO PATOLÓGICOS'), tblNoPatologico(data),
      secHeading('6. ANTECEDENTES GINECO-OBSTÉTRICOS'), tblGineco(data),
      tblIncapacidad(data),
      secHeading('10. EXPLORACIÓN FÍSICA'),
      tblVitales(data), tblCabezaOidos(data), tblOjos(data), tblBocaNariz(data),
      tblExplo4('Cuello',          ['Ganglios','Movilidad','Tiroides','Acantosis','Pulsos'],                                                                        data.expCuello,     W12),
      tblExplo4('Área Precordial', ['Forma','Ruidos Cardiacos','Mamas','Campos pulmonares'],                                                                        data.expPrecordial, W13),
      tblExplo4('M. Torácicos',    ['Integridad','Forma','Articulaciones','Tono Muscular','Reflejos','Sensibilidad'],                                               data.expMTor,       W13),
      tblExplo4('M. Pélvicos',     ['Integridad','Forma','Articulaciones','Tono Muscular','Reflejos','Sensibilidad','Micosis (Si / No)','Edemas (Si / No)','Varices (Si / No)'], data.expMPel, W13),
      tblExplo4('Abdomen',         ['Forma','Visceromegalias (Si / No)','Hernias (Si / No)'],                                                                       data.expAbdomen,    W13),
      tblGenitalesPielColumnas(data),
      secHeading('11. ESTUDIOS DE GABINETE Y LABORATORIO'), tblRadiografia(data), tblLaboratorio(data),
      secHeading('12. CONCLUSIONES'), tblConclusiones(data),
    ],
  };
  return pdfmake.createPdf(docDefinition).getBuffer();
}

module.exports = { generarPDF };
