import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../services/api';
import { Activity, Users, FileText, Stethoscope, AlertTriangle, Pill } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthToken';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/Stats/dashboard`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                } else {
                    console.error("Failed to load dashboard stats");
                }
            } catch (err) {
                console.error("Connection error loading stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full pt-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clinical-blue"></div>
            </div>
        );
    }

    const { kpis, tendenciaMensual, areasAtendidas, topMedicamentos } = stats || {
        kpis: { totalPacientes: 0, totalMedicos: 0, consultasHoy: 0 },
        tendenciaMensual: [],
        areasAtendidas: [],
        topMedicamentos: []
    };

    const cards = [
        { title: 'Pacientes Registrados', value: kpis.totalPacientes, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Personal Médico', value: kpis.totalMedicos, icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { title: 'Consultas Hoy', value: kpis.consultasHoy, icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Alertas IA', value: 0, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
    ];

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Centro de Comando Clínico</h1>
                    <p className="text-sm text-gray-500 mt-1">Vision General del Sistema Hospitalario</p>
                </div>
                <div className="flex space-x-2 items-center">
                    <span className="text-sm font-medium text-clinical-blue bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                        Bienvenido, {user?.NombreCompleto || 'Doctor'}
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={kpi.title}
                            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex items-center">
                                <div className={`p-3 rounded-lg ${kpi.bg}`}>
                                    <Icon className={`h-6 w-6 ${kpi.color}`} />
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="text-sm font-semibold text-gray-500 truncate">{kpi.title}</h3>
                                    <div className="mt-1 text-3xl font-bold text-gray-900">{kpi.value}</div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Monthly Trends (Spans 2 columns) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-clinical-blue" />
                        Tendencia Anual de Incidentes (Consultas)
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={tendenciaMensual} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{ stroke: '#93C5FD', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Area type="monotone" dataKey="Consultas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorConsultas)" activeDot={{ r: 6, strokeWidth: 0, fill: '#1E40AF' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 2. Top Specialities/Areas */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-indigo-500" />
                        Áreas Atendidas
                    </h3>
                    <div className="h-64 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={areasAtendidas}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {areasAtendidas.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [`${value} Pacientes`, 'Volumen']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 3. Top Medications (Spans Full Width Below) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Pill className="h-5 w-5 mr-2 text-green-500" />
                        Top 5 Medicamentos Recetados
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topMedicamentos}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 13, fontWeight: 500 }} width={120} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="Frecuencia" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                                    {topMedicamentos.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;
