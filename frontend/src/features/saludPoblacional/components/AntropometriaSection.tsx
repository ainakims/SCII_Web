import React, { useMemo, useState } from "react";
import { BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador, evolucionComposicion } from "../analytics";
import { clasificarIMC, clasificarIMCSimplificado, clasificarICT, CATEGORIAS_IMC_OMS, Nivel } from "../clinicalRules";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

const BANDA_IMC_NORMAL: [number, number] = [18.5, 25];

const OPCIONES_CANTIDAD_DEPTOS = [5, 10, 15, 20] as const;
type CantidadDeptos = typeof OPCIONES_CANTIDAD_DEPTOS[number] | "todos";

// Paleta categórica por departamento (identidad, no severidad clínica) — se repite
// si hay más departamentos que colores.
const PALETA_DEPTO = [
  "#002E6D", "#009BDE", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#0d9488", "#eab308", "#6366f1", "#ec4899",
  "#14b8a6", "#f97316", "#3b82f6", "#84cc16", "#a855f7",
];

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

const selectCls =
  "w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-3 pr-8 py-2 rounded-lg text-xs font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer";

interface AntropometriaSectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
}

const NIVEL_COLOR: Record<Nivel, string> = {
  bajo: "#009BDE",
  normal: "#22c55e",
  leve: "#eab308",
  alto: "#ef4444",
  critico: "#991b1b",
  sin_dato: "#9ca3af",
};

// Colores por categoría OMS simplificada, usados en la gráfica de composición.
const COLOR_CATEGORIA_IMC: Record<string, string> = {
  "Bajo peso": NIVEL_COLOR.bajo,
  "Normopeso": NIVEL_COLOR.normal,
  "Sobrepeso": NIVEL_COLOR.leve,
  "Obesidad": NIVEL_COLOR.alto,
};

// Umbrales OMS explicados para la leyenda de "Clasificación IMC" — qué significa
// cada categoría y cuál es el rango saludable (mejora solicitada).
const UMBRALES_IMC_LEYENDA: { categoria: string; rango: string; nivel: Nivel; sano: boolean }[] = [
  { categoria: "Bajo peso", rango: "< 18.5 kg/m²", nivel: "bajo", sano: false },
  { categoria: "Normopeso", rango: "18.5 – 24.9 kg/m² (saludable)", nivel: "normal", sano: true },
  { categoria: "Sobrepeso", rango: "25 – 29.9 kg/m²", nivel: "leve", sano: false },
  { categoria: "Obesidad", rango: "≥ 30 kg/m²", nivel: "alto", sano: false },
];

// Tooltip personalizado que replica el formato "Periodo (Total: N) / categoría: n (pct%)".
const TooltipComposicion: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const total = payload[0]?.payload?.total ?? 0;
  return (
    <div className="bg-white shadow-lg rounded-lg p-3 text-xs border border-gray-100 min-w-40">
      <p className="font-bold text-gray-700 mb-1.5">{label} (Total: {total.toLocaleString("es-MX")})</p>
      {[...payload].reverse().map((p: any) => (
        <p key={p.dataKey} className="flex justify-between gap-3" style={{ color: p.color }}>
          <span>{p.dataKey}</span>
          <span className="font-semibold">{p.value} ({total ? ((p.value / total) * 100).toFixed(0) : 0}%)</span>
        </p>
      ))}
    </div>
  );
};

const TooltipImcPorDepto: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white shadow-lg rounded-lg p-2.5 text-xs border border-gray-100">
      <p className="font-bold text-gray-700 flex items-center gap-1.5">
        <span className="size-2 rounded-full inline-block" style={{ backgroundColor: p.color }}></span>
        {p.depto}
      </p>
      <p className="text-gray-500">IMC: <span className="font-semibold text-gray-700">{p.y}</span></p>
    </div>
  );
};

// Sección 24 del documento, con comparación por sexo, umbral OMS y composición en
// el tiempo (mejoras solicitadas). La composición en el tiempo usa Fecha (siempre
// disponible en el estado actual) en vez de FechaNacimiento (frecuentemente
// ausente), evitando que la falta de edad deje gráficas vacías.
const AntropometriaSection: React.FC<AntropometriaSectionProps> = ({ estadoActual, historico }) => {
  // Cantidad/Mes por defecto: es la vista que más interesa en el día a día.
  const [periodicidad, setPeriodicidad] = useState<"anio" | "mes">("mes");
  const [modo, setModo] = useState<"cantidad" | "porcentaje">("cantidad");
  // "Todos" por defecto: se pueden filtrar a n departamentos cuando se necesite
  // enfocar la vista (mejora solicitada).
  const [cantidadDeptos, setCantidadDeptos] = useState<CantidadDeptos>("todos");

  const imc = useMemo(() => estadisticasIndicador(estadoActual, "IMC"), [estadoActual]);
  const peso = useMemo(() => estadisticasIndicador(estadoActual, "Peso"), [estadoActual]);
  const altura = useMemo(() => estadisticasIndicador(estadoActual, "Altura"), [estadoActual]);
  const ict = useMemo(() => estadisticasIndicador(estadoActual, "ICT"), [estadoActual]);

  const distribucionImc = useMemo(() => {
    const conteo = new Map<string, { count: number; nivel: Nivel }>();
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE") return;
      const { label, nivel } = clasificarIMC(r.IMC.usado);
      const actual = conteo.get(label);
      conteo.set(label, { count: (actual?.count ?? 0) + 1, nivel });
    });
    return Array.from(conteo.entries()).map(([label, v]) => ({ label, ...v }));
  }, [estadoActual]);

  // Clasificación IMC (bandas OMS simplificadas), con el umbral saludable resaltado.
  const clasificacionImc = useMemo(() => {
    const conteo = new Map<string, number>();
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE") return;
      const categoria = clasificarIMCSimplificado(r.IMC.usado);
      if (!categoria) return;
      conteo.set(categoria, (conteo.get(categoria) ?? 0) + 1);
    });
    return CATEGORIAS_IMC_OMS.map((categoria) => ({ categoria, count: conteo.get(categoria) ?? 0 }));
  }, [estadoActual]);

  // Evolución de la composición de IMC en el tiempo (área apilada / porcentual).
  // Reemplaza los antiguos gráficos "por grupo etario", que dependían de
  // FechaNacimiento — un dato frecuentemente ausente — y quedaban vacíos.
  const composicionImc = useMemo(
    () => evolucionComposicion(
      historico,
      (r) => (r.IMC.estado === "FALTANTE" ? null : clasificarIMCSimplificado(r.IMC.usado)),
      periodicidad
    ),
    [historico, periodicidad]
  );

  // IMC por departamento (departamento es un dato mucho más confiable que la
  // fecha de nacimiento, que suele faltar). Un punto = una persona, para poder
  // ver la dispersión real de valores dentro de cada departamento, no solo el
  // promedio. Los puntos se distribuyen (jitter) dentro de la columna de su
  // departamento para que no se sobrepongan exactamente. El color identifica al
  // departamento (no la severidad clínica del punto).
  const { puntosImcPorDepto, departamentos, coloresDepto } = useMemo(() => {
    const conteoPorDepto = new Map<string, number>();
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE" || !r.Depto_nombre) return;
      conteoPorDepto.set(r.Depto_nombre, (conteoPorDepto.get(r.Depto_nombre) ?? 0) + 1);
    });

    const ordenados = Array.from(conteoPorDepto.entries()).sort((a, b) => b[1] - a[1]);
    const deptos = (cantidadDeptos === "todos" ? ordenados : ordenados.slice(0, cantidadDeptos)).map(([depto]) => depto);
    const indexPorDepto = new Map(deptos.map((d, i) => [d, i]));
    const colores = new Map(deptos.map((d, i) => [d, PALETA_DEPTO[i % PALETA_DEPTO.length]]));

    const contadorEnDepto = new Map<string, number>();
    const puntos: { x: number; y: number; nivel: Nivel; depto: string; color: string }[] = [];
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE" || !r.Depto_nombre) return;
      const idx = indexPorDepto.get(r.Depto_nombre);
      if (idx == null) return;
      const total = conteoPorDepto.get(r.Depto_nombre) ?? 1;
      const i = contadorEnDepto.get(r.Depto_nombre) ?? 0;
      contadorEnDepto.set(r.Depto_nombre, i + 1);
      const jitter = total > 1 ? -0.32 + (0.64 * i) / (total - 1) : 0;
      puntos.push({
        x: idx + jitter,
        y: r.IMC.usado as number,
        nivel: clasificarIMC(r.IMC.usado).nivel,
        depto: r.Depto_nombre as string,
        color: colores.get(r.Depto_nombre as string) ?? "#94a3b8",
      });
    });

    return { puntosImcPorDepto: puntos, departamentos: deptos, coloresDepto: colores };
  }, [estadoActual, cantidadDeptos]);

  // Métricas nutricionales adicionales (mejora solicitada).
  const metricas = useMemo(() => {
    const conImc = estadoActual.filter((r) => r.IMC.estado !== "FALTANTE");
    const normopeso = conImc.filter((r) => clasificarIMCSimplificado(r.IMC.usado) === "Normopeso").length;
    const conIct = estadoActual.filter((r) => r.ICT.estado === "VALIDO" || r.ICT.estado === "FUERA_DE_RANGO");
    const ictElevado = conIct.filter((r) => clasificarICT(r.ICT.numerico).nivel !== "normal").length;
    const inconsistenciasImc = estadoActual.filter((r) => r.IMC.estado === "INCONSISTENTE").length;
    return {
      pctNormopeso: conImc.length ? Number(((normopeso / conImc.length) * 100).toFixed(1)) : null,
      pctIctElevado: conIct.length ? Number(((ictElevado / conIct.length) * 100).toFixed(1)) : null,
      nConIct: conIct.length,
      inconsistenciasImc,
    };
  }, [estadoActual]);

  return (
    <SectionCard icon="human" title="Antropometría" subtitle="Peso, altura, IMC e ICT (estado actual)">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard icon="scale-bathroom" label="IMC" value={imc.media ?? "Sin dato"} sub={imc.n ? `mediana ${imc.mediana} · n=${imc.n}` : undefined} />
        <KpiCard icon="weight-kilogram" label="Peso (kg)" value={peso.media ?? "Sin dato"} sub={peso.n ? `n=${peso.n}` : undefined} />
        <KpiCard icon="human-male-height" label="Altura (m)" value={altura.media ?? "Sin dato"} sub={altura.n ? `n=${altura.n}` : undefined} />
        <KpiCard icon="ruler-square" label="ICT promedio" value={ict.media ?? "Sin dato"} sub={ict.n ? `n=${ict.n}` : undefined} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon="check-decagram-outline" label="% Normopeso" value={metricas.pctNormopeso != null ? `${metricas.pctNormopeso}%` : "Sin dato"} />
        <KpiCard icon="alert-circle-outline" label="ICT elevado (>50)" value={metricas.pctIctElevado != null ? `${metricas.pctIctElevado}%` : "Sin dato"} sub={metricas.nConIct ? `n=${metricas.nConIct}` : undefined} />
        <KpiCard icon="swap-horizontal-circle-outline" label="Inconsistencias IMC" value={metricas.inconsistenciasImc} sub="IMC reportado vs. calculado" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Distribución por categoría de IMC</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribucionImc} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Personas" radius={[4, 4, 0, 0]}>
                {distribucionImc.map((d, i) => <Cell key={i} fill={NIVEL_COLOR[d.nivel]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-600 mb-2">Clasificación IMC</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={clasificacionImc} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="gradienteImc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0070BD" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0070BD" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: any) => [`${value} personas`, "Cantidad"]} />
              <Area
                type="monotone"
                dataKey="count"
                name="Personas"
                stroke="#0070BD"
                strokeWidth={2}
                fill="url(#gradienteImc)"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const info = UMBRALES_IMC_LEYENDA.find((u) => u.categoria === payload.categoria);
                  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill={NIVEL_COLOR[info?.nivel ?? "sin_dato"]} stroke="#fff" strokeWidth={1.5} />;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            {UMBRALES_IMC_LEYENDA.map((u) => (
              <div key={u.categoria} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: NIVEL_COLOR[u.nivel] }}></span>
                <span className={u.sano ? "font-semibold text-gray-700" : ""}>{u.categoria}: {u.rango}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-xs font-bold text-gray-600">Evolución de la composición de IMC</h3>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                onClick={() => setModo("porcentaje")}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${modo === "porcentaje" ? "bg-sea-blue text-white" : "bg-gray-100 text-gray-500"}`}
              >
                Porcentaje
              </button>
              <button
                onClick={() => setModo("cantidad")}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${modo === "cantidad" ? "bg-sea-blue text-white" : "bg-gray-100 text-gray-500"}`}
              >
                Cantidad
              </button>
              <span className="w-px h-4 bg-gray-200 mx-1"></span>
              <button
                onClick={() => setPeriodicidad("anio")}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${periodicidad === "anio" ? "bg-sea-blue text-white" : "bg-gray-100 text-gray-500"}`}
              >
                Por año
              </button>
              <button
                onClick={() => setPeriodicidad("mes")}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${periodicidad === "mes" ? "bg-sea-blue text-white" : "bg-gray-100 text-gray-500"}`}
              >
                Por mes
              </button>
            </div>
          </div>
          {composicionImc.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={composicionImc} stackOffset={modo === "porcentaje" ? "expand" : "none"} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (modo === "porcentaje" ? `${Math.round(v * 100)}%` : String(v))} />
                <Tooltip content={<TooltipComposicion />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {CATEGORIAS_IMC_OMS.map((categoria) => (
                  <Area key={categoria} type="monotone" dataKey={categoria} name={categoria} stackId="1" stroke={COLOR_CATEGORIA_IMC[categoria]} fill={COLOR_CATEGORIA_IMC[categoria]} fillOpacity={0.75} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 text-center px-6">Sin datos suficientes para construir la serie histórica.</div>
          )}
          <p className="text-[10px] text-gray-400 mt-1">
            Proporción de personas por categoría de IMC (OMS) en cada periodo, sobre el historial completo de evaluaciones filtradas.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-xs font-bold text-gray-600">
              IMC por departamento — banda normal ({BANDA_IMC_NORMAL[0]}–{BANDA_IMC_NORMAL[1]} kg/m²)
            </h3>
            <div className="w-40 relative">
              <select className={selectCls} value={cantidadDeptos} onChange={(e) => setCantidadDeptos(e.target.value === "todos" ? "todos" : (Number(e.target.value) as CantidadDeptos))}>
                <option value="todos">Todos los departamentos</option>
                {OPCIONES_CANTIDAD_DEPTOS.map((n) => <option key={n} value={n}>Top {n} departamentos</option>)}
              </select>
              <i className="mdi mdi-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
            </div>
          </div>
          {puntosImcPorDepto.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(600, departamentos.length * 60) }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        domain={[-0.6, departamentos.length - 0.4]}
                        ticks={departamentos.map((_, i) => i)}
                        tickFormatter={(v) => truncar(departamentos[v] ?? "", 16)}
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis type="number" dataKey="y" name="IMC" tick={{ fontSize: 10 }} label={{ value: "IMC (kg/m²)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                      <Tooltip content={<TooltipImcPorDepto />} />
                      <ReferenceLine y={BANDA_IMC_NORMAL[0]} stroke="#10b981" strokeDasharray="6 4" label={{ value: `${BANDA_IMC_NORMAL[0]}`, fontSize: 10, fill: "#10b981", position: "insideTopRight" }} />
                      <ReferenceLine y={BANDA_IMC_NORMAL[1]} stroke="#10b981" strokeDasharray="6 4" label={{ value: `${BANDA_IMC_NORMAL[1]}`, fontSize: 10, fill: "#10b981", position: "insideTopRight" }} />
                      <Scatter data={puntosImcPorDepto}>
                        {puntosImcPorDepto.map((p, i) => <Cell key={i} fill={p.color} fillOpacity={0.8} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 mb-2">
                Cada punto es una persona (estado actual). El color identifica el departamento (ver leyenda). Líneas verdes: banda normal de IMC.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {departamentos.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 text-gray-600">
                    <span className="size-2 rounded-full inline-block" style={{ backgroundColor: coloresDepto.get(d) }}></span>
                    {truncar(d, 28)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-gray-400 text-center px-6">Sin datos suficientes de IMC/departamento.</div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default AntropometriaSection;
