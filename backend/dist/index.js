"use strict";
// require('dotenv').config();
// const sql = require('mssql');
// const express = require('express');
// const cors = require('cors');
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const db_1 = require("./server/config/db");
const paths_1 = require("./utils/paths");
const LoginRoutes_1 = __importDefault(require("./routes/LoginRoutes"));
const consultRoutes_1 = __importDefault(require("./routes/consultRoutes"));
// import DashboardRouter from './routes/DashboardRoutes';
const PerfilRoutes_1 = __importDefault(require("./routes/PerfilRoutes"));
const AgendaRoutes_1 = __importDefault(require("./routes/AgendaRoutes"));
const ConsultasRoutes_1 = __importDefault(require("./routes/ConsultasRoutes"));
const IndicadoresRoutes_1 = __importDefault(require("./routes/IndicadoresRoutes"));
const EvaluacionRoutes_1 = __importDefault(require("./routes/EvaluacionRoutes"));
const RecetasRoutes_1 = __importDefault(require("./routes/RecetasRoutes"));
const DocumentosRoutes_1 = __importDefault(require("./routes/DocumentosRoutes"));
const PacientesRoutes_1 = __importDefault(require("./routes/PacientesRoutes"));
const ConfigRoutes_1 = __importDefault(require("./routes/ConfigRoutes"));
const SaludPoblacionalRoutes_1 = __importDefault(require("./routes/SaludPoblacionalRoutes"));
const AnalisisIndividualRoutes_1 = __importDefault(require("./routes/AnalisisIndividualRoutes"));
// import GruposRouter from './routes/GruposRoutes';
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    // origon: "https://10.133.18.28:3000",
    credentials: true
}));
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
const db = (0, db_1.createDb)();
// const cookieParser = require("cookie-parser");
// app.use(cookieParser());
app.use('/uploads', express_1.default.static((0, paths_1.resolveUploadsDir)()));
app.use('/LoginToken', (0, LoginRoutes_1.default)(db));
app.use('/AsistenteIA', (0, consultRoutes_1.default)(db));
// app.use('/Dashboard', DashboardRouter(db));
app.use('/Perfil', (0, PerfilRoutes_1.default)(db));
app.use('/Agenda', (0, AgendaRoutes_1.default)(db));
app.use('/Consultas', (0, ConsultasRoutes_1.default)(db));
app.use('/Indicadores', (0, IndicadoresRoutes_1.default)(db));
app.use('/Evaluacion', (0, EvaluacionRoutes_1.default)(db));
app.use('/Recetas', (0, RecetasRoutes_1.default)(db));
app.use('/Documentos', (0, DocumentosRoutes_1.default)(db));
app.use('/Pacientes', (0, PacientesRoutes_1.default)(db));
app.use('/Configuracion', (0, ConfigRoutes_1.default)(db));
app.use('/SaludPoblacional', (0, SaludPoblacionalRoutes_1.default)(db));
app.use('/AnalisisIndividual', (0, AnalisisIndividualRoutes_1.default)());
// app.use('/Grupos', GruposRouter(db));
// app.use('/Stats', require('./routes/statsRoutes'));
// app.use('/api/Inventario', require('./routes/inventoryRoutes'));
// app.listen(5000, () => {
//     console.log("Servidor escuchando en http://localhost:5000");
// });
app.listen(PORT, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
// const dbConfig = {
//     user: 'sa',
//     password: 'Tngdba01!',
//     server: '10.133.8.77',
//     database: 'TNG',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true
//     }
// };
