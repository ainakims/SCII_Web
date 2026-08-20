"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUploadsDir = resolveUploadsDir;
const path = require("path");
// Resuelve SIEMPRE la misma carpeta física de uploads, sin importar si el
// proceso corre desde el código fuente (ts-node, __dirname = backend/utils)
// o desde el compilado (node dist/..., __dirname = backend/dist/utils).
// Sin esto, cada entorno terminaba escribiendo/leyendo en una carpeta
// distinta (backend/uploads vs backend/dist/uploads) y los documentos
// subidos en uno no se veían en el otro.
//
// UPLOADS_DIR permite apuntar a una ruta compartida (ej. un recurso de red)
// cuando el entorno "publicado" corre en una máquina distinta a la de
// desarrollo local.
function resolveUploadsDir() {
    if (process.env.UPLOADS_DIR) {
        return path.resolve(process.env.UPLOADS_DIR);
    }
    const marker = path.sep + 'dist';
    const idx = __dirname.toLowerCase().indexOf(marker.toLowerCase());
    const backendRoot = idx !== -1 ? __dirname.slice(0, idx) : path.join(__dirname, '..');
    return path.join(backendRoot, 'uploads');
}
