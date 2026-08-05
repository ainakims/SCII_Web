import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador, histogramaConjunto, obtenerValor, promedioPorGrupo, calcularEdad } from "../analytics";
import { clasificarGrupoEtario, clasificarPresion, NIVEL_ESTILOS, Nivel } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

interface CardiovascularSectionProps {
  estadoActual: RegistroValidado[];
}

const NIVEL_COLOR: Record<Nivel, string> = {
  bajo: "#009BDE",
  normal: "#22c55e",
  leve: "#eab308",
  alto: "#ef4444",
  critico: "#991b1b",
  sin_dato: "#9ca3af",
};

// Sección 25 del documento.
const CardiovascularSection: React.FC<CardiovascularSectionProps> = ({ estadoActual }) => {
  const sistolica = useMemo(() => estadisticasIndicador(estadoActual, "Sistolica"), [estadoActual]);
  const diastolica = useMemo(() => estadisticasIndicador(estadoActual, "Diastolica"), [estadoActual]);

  // Sistólica y diastólica son un mismo conjunto de mediciones (una presión
  // arterial), no dos valores independientes — se muestran en una sola gráfica.
  const distPresion = useMemo(() => {
    const sist = estadoActual.map((r) => obtenerValor(r, "Sistolica")).filter((v): v is number => v != null);
    const diast = estadoActual.map((r) => obtenerValor(r, "Diastolica")).filter((v): v is number => v != null);
    console.log("Datos sistolicos:", JSON.stringify(estadoActual.map((r) => obtenerValor(r, "Sistolica"))));
    console.log("Datos diastolicos:", JSON.stringify(estadoActual.map((r) => obtenerValor(r, "Diastolica"))));
    console.log("Todos los datos de estado actual:", JSON.stringify(estadoActual))
    return histogramaConjunto({ "Sistólica": sist, "Diastólica": diast }, 10);
  }, [estadoActual]);

  // Siempre por persona (estado actual): evaluamos el conjunto poblacional, no
  // registros históricos individuales, que pueden repetir/duplicar a una misma
  // persona varias veces y distorsionar la lectura del conjunto.
  const scatterData = useMemo(() => {
    return estadoActual
      .map((r) => ({ x: obtenerValor(r, "Sistolica"), y: obtenerValor(r, "Diastolica") }))
      .filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
  }, [estadoActual]);

  const sistolicaPorDepto = useMemo(
    () => promedioPorGrupo(estadoActual, "Sistolica", (r) => r.Depto_nombre).slice(0, 10),
    [estadoActual]
  );

  const sistolicaPorGrupoEtario = useMemo(
    () => promedioPorGrupo(estadoActual, "Sistolica", (r) => clasificarGrupoEtario(calcularEdad(r.FechaNacimiento.original, r.Fecha.original))),
    [estadoActual]
  );

  // Estadios de presión arterial (ACC/AHA), a partir de Sistólica + Diastólica combinadas.
  const estadiosPresion = useMemo(() => {
    const conteo = new Map<string, { count: number; nivel: Nivel }>();
    estadoActual.forEach((r) => {
      const sist = obtenerValor(r, "Sistolica");
      const diast = obtenerValor(r, "Diastolica");
      if (sist == null || diast == null) return;
      const { label, nivel } = clasificarPresion(sist, diast);
      const actual = conteo.get(label);
      conteo.set(label, { count: (actual?.count ?? 0) + 1, nivel });
    });
    return Array.from(conteo.entries()).map(([label, v]) => ({ label, ...v }));
  }, [estadoActual]);
  const totalConPresion = estadiosPresion.reduce((acc, e) => acc + e.count, 0);

  return (
    <SectionCard icon="heart-pulse" title="Cardiovascular" subtitle="Presión sistólica y diastólica">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon="heart-pulse" label="Sistólica" value={sistolica.media != null ? Math.round(sistolica.media) : "Sin dato"} sub={sistolica.n ? `mediana ${Math.round(sistolica.mediana as number)} · n=${sistolica.n}` : undefined} />
        <KpiCard icon="heart-outline" label="Diastólica" value={diastolica.media != null ? Math.round(diastolica.media) : "Sin dato"} sub={diastolica.n ? `mediana ${Math.round(diastolica.mediana as number)} · n=${diastolica.n}` : undefined} />
        <KpiCard icon="arrow-up-bold" label="Sistólica máx." value={sistolica.max ?? "Sin dato"} />
        <KpiCard icon="arrow-down-bold" label="Diastólica mín." value={diastolica.min ?? "Sin dato"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold text-gray-600 mb-2">Distribución de presión arterial (sistólica y diastólica)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distPresion} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Sistólica" name="Sistólica" fill="#002E6D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Diastólica" name="Diastólica" fill="#009BDE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Estadios de presión arterial (ACC/AHA)</h3>
          {totalConPresion > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={estadiosPresion} dataKey="count" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {estadiosPresion.map((e, i) => <Cell key={i} fill={NIVEL_COLOR[e.nivel]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} (${((Number(value) / totalConPresion) * 100).toFixed(1)}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 justify-center -mt-2">
                {estadiosPresion.map((e) => (
                  <span key={e.label} className={`px-2 py-1 rounded-lg text-[9px] font-semibold ${NIVEL_ESTILOS[e.nivel]}`}>{e.label}: {e.count}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Sistólica promedio por grupo etario</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sistolicaPorGrupoEtario} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="promedio" name="Sistólica promedio" fill="#0070BD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold text-gray-600 mb-2">Sistólica × Diastólica ({estadoActual.length.toLocaleString("es-MX")} personas)</h3>
          <p className="text-[10px] text-gray-400 mb-2">
            Cada punto representa una persona (estado actual). Líneas verdes: límite normal (120/80). Línea roja: umbral HTA etapa 2 (140).
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name="Sistólica" tick={{ fontSize: 10 }} domain={["dataMin - 5", "dataMax + 5"]} />
              <YAxis type="number" dataKey="y" name="Diastólica" tick={{ fontSize: 10 }} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine x={120} stroke="#10b981" strokeDasharray="4 4" label={{ value: "120", fontSize: 9, fill: "#10b981" }} />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value: "80", fontSize: 9, fill: "#10b981" }} />
              <ReferenceLine x={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "140", fontSize: 9, fill: "#ef4444" }} />
              <Scatter data={scatterData} fill="#005FAA" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Sistólica promedio por departamento (top 10)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sistolicaPorDepto} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="promedio" name="Sistólica promedio" fill="#0090D8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
};

export default CardiovascularSection;
