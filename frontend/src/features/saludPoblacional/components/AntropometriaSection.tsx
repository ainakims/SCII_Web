import React, { useMemo, useState } from "react";
import { BarChart, Bar, ComposedChart, Scatter, PieChart, Pie, Sector, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, Cell } from "recharts";
import { RegistroValidado } from "../types";
import { estadisticasIndicador } from "../analytics";
import { clasificarIMC, clasificarIMCSimplificado, clasificarICT, NIVEL_ESTILOS, Nivel } from "../clinicalRules";
import { generarResumenMedico } from "../resumenMedico";
import SectionCard from "./shared/SectionCard";
import KpiCard from "./shared/KpiCard";

const BANDA_IMC_NORMAL: [number, number] = [18.5, 25];

const RADIAN = Math.PI / 180;
// Distancia (px) que se desplaza una rebanada seleccionada hacia afuera del centro.
const EXPLODE_OFFSET_ICT = 10;

// Paleta categórica por departamento (identidad, no severidad clínica) — se repite
// si hay más departamentos que colores.
const PALETA_DEPTO = [
  "#009BDE",
];

// Mismo estilo que los selects de filtro de las tablas (Departamentos/Pacientes).
const filtroSelectCls = "text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer";

// Pendiente: aún no filtra nada (ver TIPOS_EMPLEADO en DepartamentoTabla.tsx),
// solo deja el control listo para cuando el dato esté disponible.
type TipoEmpleado = "" | "confianza" | "sindicalizado";
const TIPOS_EMPLEADO: { value: TipoEmpleado; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "confianza", label: "Confianza" },
  { value: "sindicalizado", label: "Sindicalizados" },
];

interface AntropometriaSectionProps {
  estadoActual: RegistroValidado[];
  historico: RegistroValidado[];
}

const NIVEL_COLOR: Record<Nivel, string> = {
  // bajo: "#009BDE",
  normal: "#009BDE",
  leve: "#FFC627",
  alto: "#EE7523",
  // ef4444
  // critico: "#991b1b",
  // sin_dato: "#9ca3af",
};

const ORDEN_IMC: { label: string; nivel: Nivel; color: string }[] = [
  { label: "Normal", nivel: "normal", color: "#009BDE" },
  { label: "Sobrepeso", nivel: "leve", color: "#FFC627" },
  { label: "Obesidad I", nivel: "alto", color: "#EE7523" },
  { label: "Obesidad II", nivel: "alto", color: "#EF4444" },
  { label: "Obesidad III", nivel: "critico", color: "#991b1b" },
];

function clasificarIctCalculado(ratio: number | null): { label: string; nivel: Nivel } {
  if (ratio == null) return { label: "Sin dato", nivel: "sin_dato" };
  if (ratio < 0.5) return { label: "Saludable", nivel: "normal" };
  if (ratio < 0.6) return { label: "Sobrepeso", nivel: "leve" };
  return { label: "Riesgo alto", nivel: "alto" };
}

const tooltipCls = "bg-white shadow-lg rounded-lg p-2.5 text-[11px]";

const TooltipImcCategoria: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className={tooltipCls}>
      <p className="font-bold text-gray-700 mb-1">Categoría de la OMS</p>
      <p className="flex items-center gap-1.5 text-gray-500">
        <span className="w-2.5 h-2 inline-block" style={{ backgroundColor: d.color }}></span>
        {d.label}: <span className="font-bold text-gray-700">{d.count}</span>
      </p>
    </div>
  );
};

export const AntropometriaContenido: React.FC<AntropometriaSectionProps> = ({ estadoActual }) => {
  const [filtroTipoEmpleado, setFiltroTipoEmpleado] = useState<TipoEmpleado>("");
  const [categoriasImcOcultas, setCategoriasImcOcultas] = useState<Set<string>>(new Set());
  const toggleCategoriaImc = (label: string) => {
    setCategoriasImcOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Categorías de ICT ocultas por clic en la leyenda (mismo toggle que IMC).
  const [categoriasIctOcultas, setCategoriasIctOcultas] = useState<Set<string>>(new Set());
  const toggleCategoriaIct = (label: string) => {
    setCategoriasIctOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Segmentos de ICT seleccionados al hacer clic directamente sobre la dona: los
  // seleccionados quedan resaltados y el resto se atenúa (sin seleccionar ninguno,
  // todos se ven normal).
  const [segmentosIctSeleccionados, setSegmentosIctSeleccionados] = useState<Set<string>>(new Set());
  const toggleSegmentoIct = (label: string) => {
    setSegmentosIctSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Rebanada de la dona de ICT: si está seleccionada, se dibuja desplazada hacia
  // afuera del centro (efecto "exploded pie"). El desplazamiento se hace con un
  // <g transform="translate(...)"> (no moviendo cx/cy del propio Sector) para que
  // el cambio se pueda animar con una transición CSS en vez de saltar de golpe.
  const renderSectorIct = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    const seleccionado = segmentosIctSeleccionados.has(payload.label);
    const offset = seleccionado ? EXPLODE_OFFSET_ICT : 0;
    const dx = offset * Math.cos(-midAngle * RADIAN);
    const dy = offset * Math.sin(-midAngle * RADIAN);
    return (
      <g
        style={{ transform: `translate(${dx}px, ${dy}px)`, transition: "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        onClick={() => toggleSegmentoIct(payload.label)}
        className="cursor-pointer"
      >
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  const resumen = useMemo(() => generarResumenMedico(estadoActual), [estadoActual]);

  const imc = useMemo(() => estadisticasIndicador(estadoActual, "IMC"), [estadoActual]);
  const peso = useMemo(() => estadisticasIndicador(estadoActual, "Peso"), [estadoActual]);
  const altura = useMemo(() => estadisticasIndicador(estadoActual, "Altura"), [estadoActual]);
  const ict = useMemo(() => estadisticasIndicador(estadoActual, "ICT"), [estadoActual]);

  const distribucionImc = useMemo(() => {
    const conteo = new Map<string, number>();
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE") return;
      const { label } = clasificarIMC(r.IMC.usado);
      conteo.set(label, (conteo.get(label) ?? 0) + 1);
    });
    return ORDEN_IMC.map((o) => ({ ...o, count: conteo.get(o.label) ?? 0 }));
  }, [estadoActual]);

  // Datos que realmente se dibujan: las categorías ocultas por la leyenda se
  // fuerzan a 0 (la barra desaparece) sin perder el conteo real en `distribucionImc`.
  const distribucionImcVisible = useMemo(
    () => distribucionImc.map((d) => (categoriasImcOcultas.has(d.label) ? { ...d, count: 0 } : d)),
    [distribucionImc, categoriasImcOcultas]
  );

  // Distribución del ICT (índice cintura-talla) por nivel de riesgo, para
  // acompañar la distribución de IMC con la misma unidad de análisis (estado
  // actual). Calculado con PA (cintura, cm) / Altura (convertida a cm).
  const distribucionIct = useMemo(() => {
    const conteo = new Map<string, { count: number; nivel: Nivel }>();
    estadoActual.forEach((r) => {
      const cinturaCm = r.PA.numerico;
      const alturaM = r.Altura.numerico;
      if (cinturaCm == null || alturaM == null || alturaM <= 0) return;
      const alturaCm = alturaM * 100;
      const { label, nivel } = clasificarIctCalculado(cinturaCm / alturaCm);
      const actual = conteo.get(label);
      conteo.set(label, { count: (actual?.count ?? 0) + 1, nivel });
    });
    return Array.from(conteo.entries()).map(([label, v]) => ({ label, ...v }));
  }, [estadoActual]);
  const totalConIct = distribucionIct.reduce((acc, d) => acc + d.count, 0);

  // Igual que distribucionImcVisible: las categorías ocultas por la leyenda
  // se fuerzan a 0 para que su porción desaparezca de la dona.
  const distribucionIctVisible = useMemo(
    () => distribucionIct.map((d) => (categoriasIctOcultas.has(d.label) ? { ...d, count: 0 } : d)),
    [distribucionIct, categoriasIctOcultas]
  );

  // IMC por departamento (departamento es un dato mucho más confiable que la
  // fecha de nacimiento, que suele faltar). Un punto = una persona, para poder
  // ver la dispersión real de valores dentro de cada departamento, no solo el
  // promedio. Los puntos se distribuyen (jitter) dentro de la columna de su
  // departamento para que no se sobrepongan exactamente. El color identifica al
  // departamento (no la severidad clínica del punto).
  const { puntosImcPorDepto, departamentos, statsPorDepto } = useMemo(() => {
    const conteoPorDepto = new Map<string, number>();
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE" || !r.Depto_Series) return;
      conteoPorDepto.set(r.Depto_Series, (conteoPorDepto.get(r.Depto_Series) ?? 0) + 1);
    });

    const deptos = Array.from(conteoPorDepto.entries()).sort((a, b) => b[1] - a[1]).map(([depto]) => depto);
    const indexPorDepto = new Map(deptos.map((d, i) => [d, i]));

    const normalPorDepto = new Map<string, number>();
    const anormalPorDepto = new Map<string, number>();
    const contadorEnDepto = new Map<string, number>();
    const puntos: { x: number; y: number; nivel: Nivel; depto: string; color: string }[] = [];
    estadoActual.forEach((r) => {
      if (r.IMC.estado === "FALTANTE" || !r.Depto_Series) return;
      const idx = indexPorDepto.get(r.Depto_Series);
      if (idx == null) return;
      const total = conteoPorDepto.get(r.Depto_Series) ?? 1;
      const i = contadorEnDepto.get(r.Depto_Series) ?? 0;
      contadorEnDepto.set(r.Depto_Series, i + 1);
      const jitter = total > 1 ? -0.32 + (0.64 * i) / (total - 1) : 0;
      const valorImc = r.IMC.usado as number;
      const dentroDelUmbral = valorImc >= BANDA_IMC_NORMAL[0] && valorImc <= BANDA_IMC_NORMAL[1];
      if (dentroDelUmbral) normalPorDepto.set(r.Depto_Series, (normalPorDepto.get(r.Depto_Series) ?? 0) + 1);
      else anormalPorDepto.set(r.Depto_Series, (anormalPorDepto.get(r.Depto_Series) ?? 0) + 1);
      puntos.push({
        x: idx + jitter,
        y: valorImc,
        nivel: clasificarIMC(valorImc).nivel,
        depto: r.Depto_Series as string,
        color: dentroDelUmbral ? "#009BDE" : "#EF4444",
      });
    });

    // Un solo tooltip por departamento (no por punto): conteo de personas dentro
    // y fuera del umbral de IMC normal, calculado sobre esas mismas personas.
    const stats = new Map<string, { count: number; normal: number; anormal: number }>();
    deptos.forEach((d) => {
      const count = conteoPorDepto.get(d) ?? 0;
      stats.set(d, { count, normal: normalPorDepto.get(d) ?? 0, anormal: anormalPorDepto.get(d) ?? 0 });
    });

    return { puntosImcPorDepto: puntos, departamentos: deptos, statsPorDepto: stats };
  }, [estadoActual]);

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
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg shadow-xl p-4">
          {/* border border-gray-200 */}
          <h3 className="text-xs font-bold text-gray-600 mb-2">
            <i className="fa-solid fa-chart-simple mr-2"></i>Categoría de la OMS
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribucionImcVisible} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={0} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<TooltipImcCategoria />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" name="Personas" radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out">
                {distribucionImcVisible.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {distribucionImc.map((d) => {
              const oculto = categoriasImcOcultas.has(d.label);
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => toggleCategoriaImc(d.label)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                >
                  <span className="w-3 h-2 inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : d.color }}></span>
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg shadow-xl p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-2">
            <i className="fa-solid fa-chart-pie mr-2"></i>Distribución de ICT
          </h3>
          {totalConIct > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distribucionIctVisible}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                    shape={renderSectorIct}
                  >
                    {distribucionIctVisible.map((d, i) => <Cell key={i} fill={NIVEL_COLOR[d.nivel]} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      const pct = totalConIct ? ((d.count / totalConIct) * 100).toFixed(1) : "0";
                      return (
                        <div className={tooltipCls}>
                          <p className="font-bold text-gray-700 mb-1">Distribución de ICT</p>
                          <p className="flex items-center gap-1.5 text-gray-500">
                            <span className="size-2 rounded-full inline-block" style={{ backgroundColor: NIVEL_COLOR[d.nivel] }}></span>
                            {d.label}: <span className="font-bold text-gray-700">{d.count} ({pct}%)</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {distribucionIct.map((d) => {
                  const oculto = categoriasIctOcultas.has(d.label);
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => toggleCategoriaIct(d.label)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold bg-gray-50 transition-opacity cursor-pointer hover:opacity-80 ${oculto ? "text-gray-300 opacity-50" : "text-gray-600"}`}
                    >
                      <span className="size-2 rounded-full inline-block" style={{ backgroundColor: oculto ? "#d1d5db" : NIVEL_COLOR[d.nivel] }}></span>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos suficientes</div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-xs font-bold text-gray-600">
              <i className="fa-solid fa-diagram-project mr-2"></i>Distribución de IMC
            </h3>
          </div>
          {puntosImcPorDepto.length > 0 ? (
            // Alto fijo (mismo que "Presión arterial (ACC/AHA)" en
            // CardiovascularSection.tsx) para que ambas gráficas midan lo
            // mismo aunque esa otra tenga una fila de leyenda debajo y esta no.
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 8, right: 30, left: 0, bottom: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[-1, departamentos.length - 0]}
                    ticks={departamentos.map((_, i) => i)}
                    tickFormatter={(value) => departamentos[value] ?? ""}
                    tick={{ fontSize: 9, fontWeight: 400, dy: 20 }}
                    interval={0}
                    angle={-45}
                    textAnchor="start"
                    height={90}
                  />
                  <YAxis type="number" dataKey="y" name="IMC" tick={{ fontSize: 10 }} label={{ value: "", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <YAxis yAxisId="hover" type="number" domain={[0, 1]} hide />
                  <Tooltip
                    cursor={{ fill: "#e2e8f0", fillOpacity: 0.5 }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const entry = payload.find((p: any) => p.dataKey === "total") ?? payload[0];
                      const p = entry.payload;
                      const s = statsPorDepto.get(p.depto);
                      return (
                        <div className={tooltipCls}>
                          <p className="font-bold text-gray-700 mb-1.5">{p.depto}</p>
                          <p className="flex items-center gap-1.5 text-gray-500">
                            <span className="size-2 rounded-full inline-block" style={{ backgroundColor: "#009BDE" }}></span>
                            Dentro del rango: <span className="font-bold text-gray-700">{s?.normal ?? 0}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-gray-500">
                            <span className="size-2 rounded-full inline-block" style={{ backgroundColor: "#EF4444" }}></span>
                            Fuera del rango: <span className="font-bold text-gray-700">{s?.anormal ?? 0}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceArea y1={BANDA_IMC_NORMAL[0]} y2={BANDA_IMC_NORMAL[1]} fill="#9ACAEB" fillOpacity={0.15} ifOverflow="extendDomain" />
                  {/* Etiquetas de umbral con offset manual (en vez de los keywords de
                      posición de Recharts): 18.5 siempre debajo de su línea (fuera de
                      la banda, por abajo) y 25 siempre encima de la suya (fuera de la
                      banda, por arriba), sin importar qué tan angosta sea la banda. */}
                  <ReferenceLine
                    y={BANDA_IMC_NORMAL[0]}
                    stroke="#9ACAEB"
                    strokeDasharray="6 4"
                    label={({ viewBox }: any) => (
                      <text x={viewBox.x + viewBox.width - 4} y={viewBox.y + 14} textAnchor="end" fontSize={10} fontWeight={700} fill="#002E6D">
                        {BANDA_IMC_NORMAL[0]}
                      </text>
                    )}
                  />
                  <ReferenceLine
                    y={BANDA_IMC_NORMAL[1]}
                    stroke="#9ACAEB"
                    strokeDasharray="6 4"
                    label={({ viewBox }: any) => (
                      <text x={viewBox.x + viewBox.width - 4} y={viewBox.y - 6} textAnchor="end" fontSize={10} fontWeight={700} fill="#002E6D">
                        {BANDA_IMC_NORMAL[1]}
                      </text>
                    )}
                  />
                  {/* Barra invisible por departamento: no se ve (fill transparente),
                      pero le da al mouse un "carril" completo (todo el alto y el
                      ancho de la columna) sobre el que activar el tooltip — igual
                      que en una gráfica de barras, en vez de tener que apuntar a
                      un punto exacto. */}
                  <Bar
                    yAxisId="hover"
                    dataKey="total"
                    data={departamentos.map((d, i) => ({ x: i, total: 1, depto: d, color: PALETA_DEPTO[i % PALETA_DEPTO.length] }))}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Scatter data={puntosImcPorDepto}>
                    {puntosImcPorDepto.map((p, i) => <Cell key={i} fill={p.color} fillOpacity={0.8} />)}
                  </Scatter>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400 text-center px-6">Sin datos suficientes de IMC/departamento.</div>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2 bg-horz-blue/15 text-yellow-700 text-[11px] px-3 py-2 rounded-lg mt-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-blue/10 shrink-0">
          <i className="mdi mdi-creation text-sea-blue text-base animate-pulse"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sea-blue uppercase tracking-wide mb-1">
            Estado nutricional
          </p>
          <p className="text-xs text-sea-blue leading-relaxed line-clamp-2 min-h-[2.4rem]">{resumen?.estadoNutricional}</p>
        </div>
      </div>
    </>
  );
};

const AntropometriaSection: React.FC<AntropometriaSectionProps> = (props) => (
  <SectionCard icon="person" title="Somatometría" subtitle="Peso, altura, IMC e ICT (estado actual)">
    <AntropometriaContenido {...props} />
  </SectionCard>
);

export default AntropometriaSection;
