const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const docxPath = 'templates/HISTORIA CLINICA MODIFICADA (2).docx';
const outputPath = 'templates/HISTORIA CLINICA MODIFICADA (2)_FIXED.docx';

console.log('Leyendo plantilla...');
const content = fs.readFileSync(docxPath, 'binary');
const zip = new PizZip(content);

// Leer document.xml
let documentXml = zip.file('word/document.xml').asText();

console.log('Limpiando proofErr tags...');
documentXml = documentXml.replace(/<w:proofErr[^>]*?\/?>/g, '');

console.log('Consolidando runs fragmentados...');
// Consolidar runs adyacentes que tengan el mismo contenido de text
documentXml = documentXml.replace(/<\/w:t><\/w:r><w:r[^>]*?><w:rPr>[\s\S]*?<\/w:rPr><w:t>/g, '</w:t><w:t>');
documentXml = documentXml.replace(/<\/w:t><\/w:r><w:r[^>]*?><w:t>/g, '</w:t><w:t>');

// Consolidar texto
documentXml = documentXml.replace(/<w:t>([^<]*)<\/w:t><w:t>/g, '<w:t>$1');

// Actualizar en el ZIP
zip.file('word/document.xml', documentXml);

// Guardar
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(outputPath, buffer);

console.log('✓ Documento reparado guardado en:', outputPath);
console.log('✓ Tamaño:', buffer.length, 'bytes');
