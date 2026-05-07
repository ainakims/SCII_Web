const jwt = require("jsonwebtoken");
const { poolPromise, sql } = require("../server/config/db");
const db = require('../server/dbService');

const getDashboardStats = async (req, res) => {
    try {
        // 1. KPIs (Cards)
        const [patientsRes, doctorsRes, agendaRes] = await Promise.all([
            db.query(`SELECT COUNT(*) AS Total FROM Pacientes`),
            db.query(`
                SELECT COUNT(M.ID) AS Total 
                FROM Medicos M 
                INNER JOIN Usuarios U ON M.UsuarioID = U.ID 
                WHERE U.IsActive = -1
            `),
            db.query(`
                SELECT COUNT(*) AS Total 
                FROM Agenda 
                WHERE DateValue(FechaHoraInicio) = Date()
            `)
        ]);

        const kpis = {
            totalPacientes: patientsRes[0]?.Total || 0,
            totalMedicos: doctorsRes[0]?.Total || 0,
            consultasHoy: agendaRes[0]?.Total || 0
        };

        // 2. Monthly Trend
        const allConsults = await db.query(`SELECT FechaHora FROM Consultas`);
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        let monthlyTrend = new Array(12).fill(0).map((_, i) => ({ name: monthNames[i], Consultas: 0 }));

        allConsults.forEach(c => {
            if (c.FechaHora) {
                const date = new Date(c.FechaHora);
                if (!isNaN(date.getTime())) {
                    monthlyTrend[date.getMonth()].Consultas += 1;
                }
            }
        });

        // 3. Areas Atendidas (Especialidades)
        const areasQuery = `
            SELECT M.Especialidad, COUNT(C.ID) AS Atenciones
            FROM (Consultas C
            INNER JOIN Medicos M ON C.MedicoID = M.ID)
            GROUP BY M.Especialidad
        `;
        let areaStats = [];
        try {
            const rawAreas = await db.query(areasQuery);
            areaStats = rawAreas.map(r => ({
                name: (r.Especialidad && r.Especialidad.trim()) ? r.Especialidad : 'Medicina General',
                value: r.Atenciones
            })).sort((a, b) => b.value - a.value).slice(0, 5);

            if (areaStats.length === 0) {
                areaStats = [{ name: 'Sin Datos', value: 0 }];
            }
        } catch (e) {
            console.warn("Error getting areas:", e);
            areaStats = [{ name: 'Error DB', value: 0 }];
        }

        // 4. Top Medicamentos (ONLY current month)
        const medQuery = `
            SELECT RD.MedicamentoID, M.NombreGenerico, RD.MedicamentoTexto, COUNT(RD.ID) AS Frecuencia
            FROM (RecetaDetalles RD
            INNER JOIN Recetas R ON RD.RecetaID = R.ID)
            LEFT JOIN Medicamentos M ON RD.MedicamentoID = M.ID
            WHERE Month(R.Fecha) = Month(Date()) AND Year(R.Fecha) = Year(Date())
            GROUP BY RD.MedicamentoID, M.NombreGenerico, RD.MedicamentoTexto
        `;

        let medStats = [];
        try {
            const rawMeds = await db.query(medQuery);
            const medMap = {};

            rawMeds.forEach(r => {
                const name = (r.NombreGenerico && r.NombreGenerico !== 'Sustancia Genérica')
                    ? r.NombreGenerico
                    : (r.MedicamentoTexto || 'Desconocido');

                if (medMap[name]) {
                    medMap[name] += r.Frecuencia;
                } else {
                    medMap[name] = r.Frecuencia;
                }
            });

            medStats = Object.keys(medMap).map(name => ({
                name,
                Frecuencia: medMap[name]
            }))
                .filter(m => m.name !== 'Desconocido' && m.Frecuencia > 0)
                .sort((a, b) => b.Frecuencia - a.Frecuencia)
                .slice(0, 5);

            if (medStats.length === 0) {
                medStats = [{ name: 'Sin medicamentos este mes', Frecuencia: 0 }];
            }
        } catch (e) {
            console.warn("Error getting medicines:", e);
            medStats = [{ name: 'Error DB', Frecuencia: 0 }];
        }

        res.status(200).json({
            kpis,
            tendenciaMensual: monthlyTrend,
            areasAtendidas: areaStats,
            topMedicamentos: medStats
        });

    } catch (error) {
        console.error("Critical error in Dashboard stats:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getDashboardStats
};