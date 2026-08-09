// require('dotenv').config();
// const sql = require('mssql');
// const express = require('express');
// const cors = require('cors');

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createDb } from './server/config/db';
import LoginRouter from './routes/LoginRoutes';
import AsistenteIA from './routes/consultRoutes';
// import DashboardRouter from './routes/DashboardRoutes';
import PerfilRouter from './routes/PerfilRoutes';
import AgendaRouter from './routes/AgendaRoutes';
import ConsultasRouter from './routes/ConsultasRoutes';
import IndicadoresRouter from './routes/IndicadoresRoutes';
import EvaluacionRouter from './routes/EvaluacionRoutes';
import RecetasRouter from './routes/RecetasRoutes';
import DocumentosRouter from './routes/DocumentosRoutes';
import Pacientes from './routes/PacientesRoutes';
import Configuracion from './routes/ConfigRoutes';
import SaludPoblacionalRouter from './routes/SaludPoblacionalRoutes';
import AnalisisIndividualRouter from './routes/AnalisisIndividualRoutes';
// import GruposRouter from './routes/GruposRoutes';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.use(cors({
  origin: "http://localhost:3000",
  // origon: "https://10.133.18.28:3000",
  credentials: true
}));
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = createDb();

// const cookieParser = require("cookie-parser");
// app.use(cookieParser());

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/LoginToken', LoginRouter(db));
app.use('/AsistenteIA', AsistenteIA(db));
// app.use('/Dashboard', DashboardRouter(db));
app.use('/Perfil', PerfilRouter(db));
app.use('/Agenda', AgendaRouter(db));
app.use('/Consultas', ConsultasRouter(db));
app.use('/Indicadores', IndicadoresRouter(db));
app.use('/Evaluacion', EvaluacionRouter(db));
app.use('/Recetas', RecetasRouter(db));
app.use('/Documentos', DocumentosRouter(db));
app.use('/Pacientes', Pacientes(db));
app.use('/Configuracion', Configuracion(db));
app.use('/SaludPoblacional', SaludPoblacionalRouter(db));
app.use('/AnalisisIndividual', AnalisisIndividualRouter());
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