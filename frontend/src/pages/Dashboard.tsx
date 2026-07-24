import API_BASE_URL from "../config";
import { fetchWithAuth } from '../services/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthToken';
import { Activity, Users, Stethoscope, AlertTriangle, Pill, LucideIcon } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar,
    PieChart, Pie, Cell, Legend, Sector
} from 'recharts';
import Swal from "sweetalert2";
import { motion } from "framer-motion";

// interface KPIStats {
//     totalPacientes: number;
//     totalMedicos: number;
//     consultasHoy: number;
// }

interface Atencion {
  Protocolo: string;
  Total: number;
  fill?: string;
}

interface Protocolos {
  Mes: number;
  NombreMes: string;
  EFG: number;
  AUX: number;
  IND: number;
}

interface Especialidad {
  Especialidad: string;
  Total: string;
}

interface CardConfig {
    title: string;
    value: number;
    icon: string;
    color: string;
    bg: string;
    accent: string;
    glow: string;
}

const COLORS = [
  "#002E6D",
  "#003E82",
  "#004E96",
  "#005FAA",
  "#0070BD",
  "#0080CF",
  "#0090D8",
  "#009BDE"
];

const Dashboard: React.FC = () => {
  const { user } = useAuth() as { user: { cuenta?: string } };
  const [atencion, setAtencion] = useState<Atencion[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolos[]>([]);
  const [especialidad, setEspecialidad] = useState<Especialidad[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const obtenerAtencion = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Dashboard/ObtenerTipoAtencion`, {
          method: "POST",
          body: JSON.stringify({ anio: selectedYear }),
        });

        let data: any = null;
        try { data = await res.json(); } catch { data = null; }
        
        if (data) {
          console.dir(data);
          // setAtencion((data.data ?? []).map((d: any) => ({ ...d, Total: parseFloat(d.Total) })));
          setAtencion((data.data ?? []).map((d: any, i: number) => ({ 
            ...d, 
            Total: parseFloat(d.Total),
            fill: COLORS[(i + 2) % COLORS.length]
          })));
        } else {
          console.error("Failed to load dashboard stats");
        }
      } catch (err) {
        console.error("Error de conexión: ", err);
      } finally {
        setLoading(false);
      }
    };

    const obtenerProtocolos = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Dashboard/ObtenerProtocolos`, {
          method: "POST",
          body: JSON.stringify({ anio: selectedYear }),
        });

        let data: any = null;
        try { data = await res.json(); } catch { data = null; }
        
        if (data) {
          const raw = data.data ?? [];
          const byMonth: Record<number, Protocolos> = {};
          raw.forEach((row: any) => {
            const mes = parseInt(row.Mes);
            if (!byMonth[mes]) {
              byMonth[mes] = { Mes: mes, NombreMes: row.NombreMes, EFG: 0, AUX: 0, IND: 0 };
            }
            const tipo = String(row.TipoAtencion).trim().toUpperCase();
            if (tipo === "EFG" || tipo === "AUX" || tipo === "IND") {
              byMonth[mes][tipo] = parseInt(row.Total) || 0;
            }
          });
          setProtocolos(Object.values(byMonth).sort((a, b) => a.Mes - b.Mes));
        } else {
          console.error("Failed to load dashboard stats");
        }
      } catch (err) {
        console.error("Error de conexión: ", err);
      } finally {
        setLoading(false);
      }
    };

    const obtenerEspecialidad = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Dashboard/ObtenerEspecialidad`, {
          method: "POST",
          body: JSON.stringify({ anio: selectedYear }),
        });

        let data: any = null;
        try { data = await res.json(); } catch { data = null; }
        
        if (data) {
          console.dir(data);
          // setEspecialidad(data.data);
          setEspecialidad((data.data ?? []).map((d: any) => ({ ...d, Total: parseFloat(d.Total) })));
        } else {
          console.error("Failed to load dashboard stats");
        }
      } catch (err) {
        console.error("Error de conexión: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    obtenerAtencion();
    obtenerProtocolos();
    obtenerEspecialidad();
  }, [selectedYear]);

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-full pt-20">
  //       <div className="w-12 h-12 rounded-full animate-spin bg-linear-to-r from-sea-blue to-sky-blue p-[4px] mt-2">
  //         <div className="w-full h-full rounded-full bg-gray-50"></div>
  //       </div>
  //     </div>
  //   );
  // }

  // Valores por defecto en caso de que stats sea null
  // const { kpis, tendenciaMensual, areasAtendidas, topMedicamentos } = stats || {
  //   kpis: { totalPacientes: 0, totalMedicos: 0, consultasHoy: 0 },
  //   tendenciaMensual: [],
  //   areasAtendidas: [],
  //   topMedicamentos: []
  // };

  const cards: CardConfig[] = [
    { title: 'Pacientes Atendidos', value: 0, icon: "account-multiple", color: 'text-white', bg: 'from-sea-blue to-sky-blue', accent: '#009BDE', glow: '#009BDE' },
    { title: 'Personal Médico', value: 0, icon: "stethoscope", color: 'text-white', bg: 'from-sea-blue to-sky-blue', accent: '#009BDE', glow: '#009BDE' },
    { title: 'Consultas Hoy', value: 0, icon: "pulse", color: 'text-white', bg: 'from-sea-blue to-sky-blue', accent: '#009BDE', glow: '#009BDE' },
    { title: 'Alertas IA', value: 0, icon: "alert-outline", color: 'text-white', bg: 'from-sea-blue to-sky-blue', accent: '#009BDE', glow: '#009BDE' },
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="relative flex w-full">
      {/* overflow-hidden */}
      <div 
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
      >
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-linear-to-r from-white to-gray-50 p-4 sm:p-6 rounded-xl shadow-xl gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Panel de Control
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Bienvenido, <b>{user?.cuenta}</b>!
              </p>
            </div>
            <div className="relative w-35 left-80 hidden">
              <i className="mdi mdi-calendar-blank absolute left-3 top-1/2 -translate-y-1/2 text-sea-blue text-base pointer-events-none"></i>
              <select
                className="w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-10 pr-10 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                {meses.slice( 0, selectedYear === currentYear ? currentMonth : 12 ).map((mes, i) => (<option key={i + 1} value={i + 1}>{mes}</option>))}
              </select>
              <i className="mdi mdi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
            </div>
            <div className="relative w-35">
              <i className="mdi mdi-calendar-blank absolute left-3 top-1/2 -translate-y-1/2 text-sea-blue text-base pointer-events-none"></i>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-10 pr-10 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                {Array.from({ length: currentYear - 2023 }, (_, i) => 2024 + i).map((y) => ( 
                // {Array.from({ length: currentYear - 2025 }, (_, i) => 2026 + i).map((y) => ( 
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <i className="mdi mdi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((kpi, idx) => (
              <motion.div
                key={kpi.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.35, type: "spring", stiffness: 340, damping: 24 }}
                className={`relative bg-linear-to-b from-white to-gray-50 rounded-xl overflow-hidden flex items-center px-5 py-4 cursor-default group shadow-xl`}
              >
                <div
                  className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full group-hover:top-0 group-hover:bottom-0 group-hover:w-[4px] transition-all duration-300"
                  style={{ background: `${kpi.bg}` }}
                />

                {/* <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  // style={{ background: `linear-gradient(135deg, ${kpi.accent}22 0%, ${kpi.accent}10 50%, ${kpi.accent}06 100%)` }}
                  // style={{ background: `linear-gradient(135deg, rgba(59, 130, 246, 0.05) 22 0%, rgba(59, 130, 246, 0.05) 10 50%, rgba(59, 130, 246, 0.05) 06 100%)` }}
                  style={{ background: `rgba(59, 130, 246, 0.08)` }}
                /> */}

                <div className={`relative z-10 size-12 rounded-md bg-linear-to-b ${kpi.bg} to-90% flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`mdi mdi-${kpi.icon} text-white text-xl`}></i>
                </div>

                <div className="ml-4 flex-1 relative z-10 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">
                    {kpi.title}
                  </p>
                  <h2 className="text-2xl font-bold text-gray-800 leading-tight">
                    {kpi.value || "0"}
                  </h2>
                </div>
              </motion.div>
            ))}
          </div>
          {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-6">
            <div className={`lg:col-span-2`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xl p-6`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="mdi mdi-chart-bar text-sea-blue mr-4"></i>
                    Desgloce de Atención
                  </h2>
                  <span className="text-xs px-3 py-1 rounded-md font-semibold bg-linear-to-r from-sea-blue to-sky-blue text-white hidden">
                    <i className="mdi mdi-help-circle mr-1.5"></i>
                    Total {protocolos.reduce((sum, d) => sum + (d.EFG + d.AUX + d.IND), 0)} 
                  </span>
                </div>
                <i className="text-xs uppercase">
                  Mensual del año {selectedYear}
                </i>
                <div className="w-full bg-transparent">
                  {protocolos.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={protocolos}
                        margin={{ top: 20, right: 60, left: 0, bottom: 20 }}
                        
                        barCategoryGap="20%"
                        barGap={4}
                      >
                        <defs>
                          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow
                              dx="0"
                              dy="5"
                              stdDeviation="3"
                              floodColor="#000000"
                              floodOpacity="0.15"
                            />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                          dataKey="NombreMes"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 11 }}
                          dy={8}
                        />
                        {/* <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 11 }}
                          dx={-5}
                          allowDecimals={false}
                        /> */}
                        <YAxis
                          // yAxisId="right"
                          // orientation="right"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 11 }}
                          dx={-10}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const mes = payload[0]?.payload?.Mes;
                            return (
                              <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                  {/* <i className="mdi mdi-calendar" style={{ marginRight: 8 }} /> */}
                                  {mes ? meses[mes - 1] : ''} {selectedYear}
                                </p>
                                {payload.map((entry, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                    <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                                    <span className="text-[10px] text-gray-700 uppercase">
                                      {entry.name ? entry.name == "Enfermedad General" ? "Enf. Gral." : entry.name == "Indicadores TNG Sano" ? "Indicadores" : entry.name == "Primeros Auxilios" ? "Prim. Auxilios" : "" : ""}: <b className="ml-1">{entry.value}</b>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          height={50}
                          iconType="rect"
                          formatter={(value) => (
                            <span style={{ color: "#374151", textTransform: "uppercase" }}>
                              {value}
                            </span>
                          )}
                          wrapperStyle={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            // background: "linear-gradient(to right, #ffffff, #f3f4f6)",
                            background: "#ffffff",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            width: "auto",
                          }}
                        />
                        <Bar
                          dataKey="AUX"
                          name="Primeros Auxilios"
                          fill="#002E6D"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                          filter="url(#barShadow)"
                        />
                        <Bar
                          dataKey="EFG"
                          name="Enfermedad General"
                          fill="#005FAA"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                          filter="url(#barShadow)"
                        />
                        <Bar
                          dataKey="IND"
                          name="Indicadores TNG Sano"
                          fill="#009BDE"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                          filter="url(#barShadow)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      {/*  */}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className={`lg:col-span-1 space-y-4`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xl p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 flex items-center">
                  <i className="mdi mdi-chart-arc text-sea-blue mr-4"></i>
                  Atención por Especialidad
                </h2>
                <i className="text-xs uppercase">
                  Suma del año {selectedYear}
                </i>
                <div className="w-full">
                  <style>
                    {`
                      .recharts-sector:focus { outline: none !important; }
                      .recharts-sector { outline: none !important; }
                      .recharts-rectangle:focus { outline: none !important; }
                      .recharts-rectangle { outline: none !important; }
                    `}
                  </style>
                  {especialidad.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <defs>
                          <filter id="shadow-xl" x="-50%" y="-50%" width="200%" height="200%">
                            {/* Sombra de profundidad (Blur alto) */}
                            <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur1" />
                            <feOffset dx="0" dy="12" in="blur1" result="offsetBlur1" />
                            <feFlood floodColor="#000000" floodOpacity="0.15" result="color1" />
                            <feComposite in="color1" in2="offsetBlur1" operator="in" result="shadow1" />

                            {/* Sombra de contacto (Blur bajo) */}
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur2" />
                            <feOffset dx="0" dy="4" in="blur2" result="offsetBlur2" />
                            <feFlood floodColor="#000000" floodOpacity="0.1" result="color2" />
                            <feComposite in="color2" in2="offsetBlur2" operator="in" result="shadow2" />

                            <feMerge>
                              <feMergeNode in="shadow1" />
                              <feMergeNode in="shadow2" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <Pie
                          data={especialidad}
                          dataKey="Total"
                          nameKey="Especialidad"
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          cornerRadius={6}
                          stroke="none"
                          strokeWidth={2}
                          filter="url(#shadow-xl)"
                          style={{ outline: "none" }}
                          onMouseEnter={(_, index) => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(null)}
                        >
                          {especialidad.map((_, index) => (
                            <Cell
                              key={`${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke="none"
                              opacity={activePieIndex === index ? 0.8 : 1}
                              style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                            />
                          ))}
                        </Pie>
                        {/* <Tooltip /> */}
                        <Tooltip
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            // const mes = payload[0]?.payload?.Mes;
                            return (
                              <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                  Atención
                                </p>
                                {payload.map((entry, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                    <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.payload.fill, flexShrink: 0 }} />
                                    <span className="text-[10px] text-gray-700 uppercase">
                                      {entry.name}: <b className="ml-1">{entry.value}</b>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={50}
                          iconType="rect"
                          formatter={(value) => <span style={{ color: "#374151" }}>{value}</span>}
                          wrapperStyle={{
                            padding: 10,
                            fontSize: "10px",
                            // background: "#f3f4f6",
                            background: "#ffffff",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <g>
                          <circle
                            cx="50%"
                            cy="38%"
                            r={40}
                            fill="white"
                            // style={{ filter: "drop-shadow(0 0 10px rgba(0, 121, 254, 0.4))" }}
                            style={{ filter: "drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))" }}
                          />
                          <text
                            x="50%"
                            y="36%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={22}
                            fontWeight={700}
                            fill="#002E6D"
                          >
                            {especialidad.reduce((sum, d) => sum + parseFloat(String(d.Total)), 0)}
                          </text>
                          <text
                            x="50%"
                            y="42%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={10}
                            fill="#6b7280"
                            className="uppercase"
                          >
                            Total
                          </text>
                        </g>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-6">
            <div className={`lg:col-span-4 space-y-4`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xl p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 flex items-center">
                  <i className="mdi mdi-chart-gantt text-sea-blue mr-4"></i>
                  Protocolos de Atención
                </h2>
                <i className="text-xs uppercase">
                  Suma del año {selectedYear}
                </i>
                <div className="w-full">
                  {atencion.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={atencion}
                        layout="vertical"
                        margin={{ top: 5, right: 60, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        {/* <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} /> */}
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={false} />
                        <YAxis
                          dataKey="Protocolo"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          width={130}
                          tick={(props) => {
                            const { x, y, payload } = props;
                            return (
                              <text
                                x={x}
                                y={y}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fill="#4B5563"
                                fontSize={10}
                              >
                                {String(payload.value).toUpperCase()}
                              </text>
                            );
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            // const mes = payload[0]?.payload?.Mes;
                            return (
                              <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                  Protocolos
                                  {/* Atención */}
                                </p>
                                {payload.map((entry, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                    <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.payload.fill, flexShrink: 0 }} />
                                    <span className="text-[10px] text-gray-700 uppercase">
                                      {entry.payload.Protocolo}: <b className="ml-1">{entry.value}</b>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          // width={600}
                          height={50}
                          content={() => (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 8,
                                justifyContent: 'center',
                                padding: '8px 12px',
                                background: '#ffffff',
                                borderRadius: 10,
                                // boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: 10,
                              }}
                            >
                              {atencion.map((item, index) => (
                                <div
                                  key={index}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: 2,
                                      background: COLORS[(index + 2) % COLORS.length],
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span style={{ color: '#374151', textTransform: 'uppercase', }}>
                                    {item.Protocolo}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          wrapperStyle={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            // background: "linear-gradient(to right, #ffffff, #f3f4f6)",
                            background: "#ffffff",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            width: "auto",
                          }}
                        />
                        {/*  */}
                        <Bar dataKey="Total" radius={[0, 4, 4, 0]} barSize={24} label={{ position: "right", offset: 10, fill: "#374151", fontSize: 11, fontWeight: 600, }}>
                          {atencion.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      {/*  */}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className={`lg:col-span-2 space-y-4`}>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;