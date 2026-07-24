const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const docxPath = 'backend/templates/HISTORIA CLINICA MODIFICADA (2).docx';
const outputPath = 'backend/templates/HISTORIA CLINICA MODIFICADA (2)_FIXED.docx';

// Leer el DOCX
const content = fs.readFileSync(docxPath, 'binary');
const zip = new PizZip(content);

// Leer document.xml
let documentXml = zip.file('word/document.xml').asText();

// Eliminar <w:proofErr> tags
documentXml = documentXml.replace(/<w:proofErr[^>]*?\/?>/g, '');

// Consolidar runs fragmentados en placeholders
// Reemplazar: </w:t></w:r><w:r...><w:t> con </w:t><w:t>
documentXml = documentXml.replace(/<\/w:t><\/w:r><w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t>/g, '</w:t><w:t>');
documentXml = documentXml.replace(/<\/w:t><\/w:r><w:r[^>]*><w:t>/g, '</w:t><w:t>');

// Limpiar texto duplicado
documentXml = documentXml.replace(/<w:t>([^<]*)<\/w:t><w:t>/g, '<w:t>$1');

// Actualizar en el ZIP
zip.file('word/document.xml', documentXml);

// Guardar
const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(outputPath, buffer);

console.log('✓ Documento reparado guardado en:', outputPath);
console.log('✓ Archivo listo para usar');
