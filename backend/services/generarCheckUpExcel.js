'use strict';

const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE = 'TNG SANO - CHECK UP PLANTA CONFIANZA 2026 Rev (2).xlsx';

// Mapeo tag -> { valor, tipo } a partir de un registro de la BD
function valorTag(tag, reg) {
  // Los valores vacíos del web-service pueden llegar como objeto ({$:...}); se tratan como vacío
  const limpio = (v) => (v == null || typeof v === 'object') ? '' : v;
  const num = (raw) => { const v = limpio(raw); return (String(v).trim() !== '' && !isNaN(Number(v))) ? { tipo: 'n', valor: Number(v) } : { tipo: '', valor: '' }; };
  const txt = (raw) => { const v = limpio(raw); return { tipo: 's', valor: v !== '' ? String(v) : '' }; };
  // numérico si se puede, si no texto (p. ej. colesterol "LO"/"HI")
  const auto = (raw) => { const v = limpio(raw); if (String(v).trim() === '') return { tipo: '', valor: '' }; return !isNaN(Number(v)) ? { tipo: 'n', valor: Number(v) } : { tipo: 's', valor: String(v) }; };

  // Tags mensuales: m{mes}_{campo}  (ej. m1_peso, m03_pa, m12_estatus)
  const mm = /^m(\d{1,2})_([a-z]+)$/.exec(tag);
  if (mm) {
    const mes = Number(mm[1]);
    const campo = mm[2];
    const rec = (reg.mensuales || []).find((r) => Number(String(limpio(r.Fecha)).split('T')[0].split('-')[1]) === mes);
    if (!rec) return { tipo: '', valor: '' };
    switch (campo) {
      case 'peso':          return num(rec.Peso);
      case 'pa':            return num(rec.PA);
      case 'imc':           return num(rec.IMC);
      case 'ict':           return num(rec.ICT);
      case 'glucosa':       return auto(rec.Glucosa);
      case 'colesterol':    return auto(rec.Colesterol);
      case 'trigliceridos': return auto(rec.Trigliceridos);
      case 'sistolica':     return num(rec.Sistolica);
      case 'diastolica':    return num(rec.Diastolica);
      case 'ta':            return txt((limpio(rec.Sistolica) !== '' && limpio(rec.Diastolica) !== '') ? `${limpio(rec.Sistolica)}/${limpio(rec.Diastolica)}` : '');
      case 'estatus':       return txt(rec.Riesgo);
      default:              return { tipo: '', valor: '' };
    }
  }

  switch (tag) {
    case 'contrato':     return txt(reg.Contrato);
    case 'departamento': return txt(reg.Departamento);
    case 'matricula':    return txt(reg.Matricula);
    case 'nombre':       return txt(reg.Empl_Nombres);
    case 'fecha':        return fechaSerial(reg.FechaNacimiento);
    case 'edad':         return num(reg.Edad);
    case 'sexo':         return txt(reg.Sexo);
    case 'cons':         return { tipo: 'n', valor: reg.Sexo === 'M' ? 23 : reg.Sexo === 'F' ? 21.5 : 0 };
    case 'talla':        return num(reg.Altura);
    case 'peso':         return num(reg.Peso);
    case 'imc':          return num(reg.IMC);
    default:             return { tipo: '', valor: '' };
  }
}

// Convierte una fecha a número de serie de Excel (para que el formato de fecha de la celda la renderice)
function fechaSerial(f) {
  if (!f) return { tipo: '', valor: '' };
  const s = String(f).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return { tipo: '', valor: '' };
  const serial = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
  return { tipo: 'n', valor: serial };
}

const escXml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function generarCheckUpExcel({ anio, registros }) {
  const templatePath = path.join(__dirname, '..', 'templates', TEMPLATE);
  if (!fs.existsSync(templatePath)) throw new Error(`Plantilla no encontrada: ${templatePath}`);

  const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));

  // 1) Resolver sharedStrings para saber qué índices son {tags}
  const ssXmlOrig = zip.file('xl/sharedStrings.xml').asText();
  const ss = [];
  ssXmlOrig.replace(/<si>([\s\S]*?)<\/si>/g, (m, inner) => {
    ss.push([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
    return m;
  });
  const tagPorIdx = {};
  ss.forEach((txt, i) => {
    const mt = /^\{([a-zA-Z0-9_]+)\}$/.exec(txt.trim());
    if (mt && mt[1] !== 'currentYear') tagPorIdx[i] = mt[1];
  });

  // {currentYear} es texto compartido (título y otras hojas): se reemplaza globalmente
  const ssXml = ssXmlOrig.replace(/\{currentYear\}/g, escXml(anio));
  zip.file('xl/sharedStrings.xml', ssXml);

  // 2) Hoja Registro (sheet1): clonar la fila 5 por cada paciente
  const sheetPath = 'xl/worksheets/sheet1.xml';
  let xml = zip.file(sheetPath).asText();

  const fila5 = (xml.match(/<row r="5"[\s\S]*?<\/row>/) || [])[0];
  if (!fila5) throw new Error('No se encontró la fila plantilla (5) en la hoja Registro.');

  const construirFila = (R, reg) => {
    let s = fila5;
    // índice de la fila
    s = s.replace(/^<row r="5"/, `<row r="${R}"`);
    // ajustar todas las referencias COL5 -> COL{R} (refs de celda y de fórmula)
    s = s.replace(/([A-Z]{1,3})5(?![0-9])/g, `$1${R}`);
    // convertir fórmulas compartidas a normales (al clonar, varios "maestros" con el mismo si corromperían el archivo)
    s = s.replace(/<f t="shared"[^>]*>/g, '<f>');
    // quitar el valor cacheado de las celdas con fórmula (Excel recalcula al abrir por fullCalcOnLoad)
    s = s.replace(/(<f[^>]*>[\s\S]*?<\/f>)<v>[\s\S]*?<\/v>/g, '$1');
    // reemplazar cada celda de tag por el valor del paciente (inline)
    for (const [idx, tag] of Object.entries(tagPorIdx)) {
      const { tipo, valor } = valorTag(tag, reg);
      const re = new RegExp(`<c r="([A-Z]+)${R}"([^>]*?) t="s"><v>${idx}<\\/v><\\/c>`, 'g');
      s = s.replace(re, (mm, col, attrs) => {
        const sAttr = (attrs.match(/s="\d+"/) || [''])[0];
        const sp = sAttr ? ' ' + sAttr : '';
        if (valor === '' || valor == null) return `<c r="${col}${R}"${sp}/>`;
        if (tipo === 'n') return `<c r="${col}${R}"${sp}><v>${valor}</v></c>`;
        return `<c r="${col}${R}"${sp} t="inlineStr"><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
      });
    }
    return s;
  };

  // Conservar filas < 5 (cabeceras) y reemplazar el resto por las filas generadas
  const sd = (xml.match(/<sheetData>([\s\S]*?)<\/sheetData>/) || [])[1] || '';
  let cabeceras = '';
  for (const rm of sd.matchAll(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)) {
    if (Number(rm[1]) < 5) cabeceras += rm[0];
  }
  const filas = registros.map((reg, i) => construirFila(5 + i, reg)).join('');
  xml = xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${cabeceras}${filas}</sheetData>`);

  // dimension acorde al número de filas
  const ultima = Math.max(5, 4 + registros.length);
  xml = xml.replace(/<dimension ref="A1:[A-Z]+\d+"\/>/, `<dimension ref="A1:FV${ultima}"/>`);

  zip.file(sheetPath, xml);

  // 3) Forzar recálculo de fórmulas al abrir (la plantilla está en calcMode manual)
  let wb = zip.file('xl/workbook.xml').asText();
  if (/<calcPr[^>]*\/>/.test(wb)) {
    wb = wb.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1"/>');
  } else {
    wb = wb.replace(/<\/workbook>/, '<calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1"/></workbook>');
  }
  zip.file('xl/workbook.xml', wb);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { generarCheckUpExcel };
