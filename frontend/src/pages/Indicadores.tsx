import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Swal from "sweetalert2";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Carnet from "../components/Carnet";
import KpiCard from "../features/saludPoblacional/components/shared/KpiCard";

// Ocultas temporalmente a pedido: solo debe verse la vista de Check-up.
// Poner en true para volver a mostrar el selector Check-up/Gráficas/Tendencia.
const MOSTRAR_TABS_VISTA = false;

// Oculto temporalmente a pedido.
const MOSTRAR_BOTON_CARNET = false;

// Mismo patrón visual que PacientesTablaSkeleton (Pacientes.tsx): filas grises
// pulsantes en vez de un spinner sobrepuesto, mientras carga el check-up.
const IndicadoresTablaSkeleton: React.FC = () => (
  <div className="h-full rounded-lg bg-white overflow-hidden animate-pulse">
    <div className="h-11 bg-gray-50"></div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
        <div className="h-3 w-16 rounded bg-gray-200"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 rounded bg-gray-200"></div>
          <div className="h-2.5 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="h-3 w-8 rounded bg-gray-200"></div>
        <div className="h-3 w-8 rounded bg-gray-200"></div>
        <div className="h-3 w-8 rounded bg-gray-200"></div>
        <div className="h-3 w-8 rounded bg-gray-200"></div>
        <div className="h-3 w-8 rounded bg-gray-200"></div>
        <div className="h-3 w-28 rounded bg-gray-200"></div>
      </div>
    ))}
  </div>
);

const todayStr = () => new Date().toISOString().split("T")[0];

const calcImc = (peso: string, altura: string): number | null => {
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  if (!p || !a || a <= 0) return null;
  return p / (a * a);
};

const calcIct = (pa: string, altura: string): number | null => {
  const c = parseFloat(pa);
  const a = parseFloat(altura);
  if (!c || !a || a <= 0) return null;
  return (c / (a * 100)) * 100; // porcentaje: ej. 52.00
};

const imcInfo = (val: number | null): { label: string; cls: string } => {
  if (val === null) { return { label: "0.00", cls: "border-gray-100 bg-gray-100 text-gray-700" }; }
  if (val < 18.5)  { return { label: val.toFixed(2), cls: "border-horz-blue/20 bg-blue-50 text-sky-blue" }; }
  if (val < 25)    { return { label: val.toFixed(2), cls: "border-horz-blue/20 bg-blue-50 text-sky-blue" }; }
  if (val < 30)    { return { label: val.toFixed(2), cls: "border-yellow-300/20 bg-yellow-50 text-yellow-500" }; }
  if (val < 35)    { return { label: val.toFixed(2), cls: "border-yellow-300/20 bg-yellow-50 text-yellow-500" }; }
  return           { label: val.toFixed(2), cls: "border-red-200/20 bg-red-50 text-red-500" };
};

const ictInfo = (val: number | null): { label: string; cls: string } => {
  if (val === null) return { label: "0.00", cls: "border-gray-100 bg-gray-100 text-gray-700" };
  if (val < 50)    return { label: val.toFixed(2), cls: "border-horz-blue/20 bg-blue-50 text-sky-blue" };
  if (val < 60)    return { label: val.toFixed(2), cls: "border-yellow-300/20 bg-yellow-50 text-yellow-500" };
  return           { label: val.toFixed(2), cls: "border-red-200/20 bg-red-50 text-red-500" };
};

const calcEdadEnAnio = (fechaNacimiento: string | null, anio: number): number | null => {
  if (!fechaNacimiento) return null;
  try {
    const [y, m, d] = String(fechaNacimiento).split("T")[0].split("-");
    const birthYear = parseInt(y);
    const birthMonth = parseInt(m);
    const birthDay = parseInt(d);
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;

    let age = anio - birthYear;
    const endOfYear = new Date(anio, 11, 31);
    const birthdayInYear = new Date(anio, birthMonth - 1, birthDay);
    if (birthdayInYear > endOfYear) age--;

    return age;
  } catch {
    return null;
  }
};

// Meta de peso a partir de talla/sexo/peso actual — se usa tanto al renderizar
// cada fila de la tabla como al reconstruir el detalle de un trabajador desde
// la URL (/Indicadores/:matricula), para no duplicar el cálculo.
const calcMetaPeso = (row: any) => {
  const constSexo = row.Sexo == "M" ? 23 : row.Sexo == "F" ? 21.5 : 0;
  const pesoIdeal = row.Altura ? ((row.Altura * row.Altura) * constSexo) * 0.13 + ((row.Altura * row.Altura) * constSexo) : null;
  // Negativo => debe bajar de peso; positivo => debe subir de peso
  const pesoPerderRaw = (row.Peso && pesoIdeal != null) ? pesoIdeal - row.Peso : null;
  const pesoPerder = pesoPerderRaw != null ? parseFloat(pesoPerderRaw.toFixed(2)).toString() : null;
  // El periodo (meses) se calcula con la magnitud, sin importar la dirección
  const magPerder = pesoPerderRaw != null ? Math.abs(pesoPerderRaw) : null;
  const perderMes = magPerder != null ? (magPerder === 0 ? 0 : magPerder <= 3.5 ? 1 : magPerder <= 5 ? 3 : magPerder <= 10 ? 6 : magPerder <= 16 ? 12 : 18) : null;
  return { pesoIdeal, pesoPerder, perderMes };
};

interface ActividadRow {
  fecha: string; actividad: string; frecuencia: string; duracion: string; estatus: string;
}

const emptyActividad = (): ActividadRow => ({
  fecha: todayStr(), actividad: "", frecuencia: "", duracion: "", estatus: "",
});

const Indicadores: React.FC = () => {
  const { matricula: matriculaParam } = useParams<{ matricula?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState<any[]>([]);
  const [mensuales, setMensuales] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedView, setSelectedView] = useState("checkUp");
  // Si ya venimos de /Indicadores/:matricula (clic en una fila o recarga
  // directa de la URL), arrancamos en modo detalle desde el primer render
  // para no mostrar ni un instante la vista de lista antes del detalle.
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(() => Boolean(matriculaParam));
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isCarnetOpen, setIsCarnetOpen] = useState(false);

  const [isProgramarOpen, setIsProgramarOpen] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditingMensual, setIsEditingMensual] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [showFiltros, setShowFiltros] = useState(true);
  const [tendencias, setTendencias] = useState<any[]>([]);
  const [mensualTotales, setMensualTotales] = useState<any[]>([]);
  const [poblacion, setPoblacion] = useState<any[]>([]);
  const [exportando, setExportando] = useState(false);

  // Igual que Pacientes.tsx: se recalcula con el resize/zoom para que la card
  // principal siempre llene el espacio disponible del viewport.
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));
  useEffect(() => {
    const updateHeight = () => setPageHeight(Math.max(window.innerHeight - 150, 400));
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const sistolicaRef  = useRef<HTMLInputElement>(null);
  const diastolicaRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    matricula: "",
    mes: "",
    talla: "",
    peso: "",
    imc: "",
    pa: "",
    ict: "",
    riesgo: "",
    sistolica: "",
    diastolica: "",
    glucosa: "",
    colesterol: "",
    trigliceridos: "",
  });

  type SortCol = "Matricula" | "Empl_Nombres" | "FechaNacimiento" | "Edad" | "Sexo" | "Altura" | "Peso" | "IMC" | "categoria" | null;
  type SortDir = "asc" | "desc" | "none";
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    if (sortDir === "asc")  { setSortDir("desc"); return; }
    if (sortDir === "desc") { setSortCol(null); setSortDir("none"); }
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "fa-sort";
    return sortDir === "asc" ? "fa-sort-up" : "fa-sort-down";
  };

  const calcImcStr = (peso: string, talla: string) => {
    const w = parseFloat(peso), h = parseFloat(talla);
    return (w > 0 && h > 0) ? (w / (h * h)).toFixed(2) : "";
  };

  const calcIctStr = (pa: string, talla: string) => {
    const c = parseFloat(pa), h = parseFloat(talla);
    return (c > 0 && h > 0) ? ((c / (h * 100)) * 100).toFixed(2) : "";
  };

  const imcCategoria = (imc: number) => {
    if (imc <= 24.99) return "Normal";
    if (imc <= 29.99) return "Sobrepeso";
    if (imc <= 34.99) return "Obesidad Grado I";
    if (imc <= 39.99) return "Obesidad Grado II";
    return "Obesidad Grado III";
  };

  const riesgoAnioInfo = (estatus: any): { label: string; cls: string } => {
    const e = String(estatus ?? "").trim().toUpperCase();
    if (!e)                  return { label: "",         cls: "text-sky-blue" };
    if (e.includes("ALTO"))      return { label: "ALTO",     cls: "bg-linear-to-r from-red-200 to-red-100/50 text-red-600" };
    if (e.includes("MODERADO"))  return { label: "MEDIO", cls: "bg-linear-to-r from-sunray-yellow/30 to-sunray-yellow/10 text-yellow-600" };
    if (e.includes("SANO") || e.includes("BAJO")) return { label: "SANO", cls: "bg-linear-to-r from-aqua-green/30 to-aqua-green/10 text-green-900" };
    if (e.includes("FALTA"))     return { label: "FALTA",       cls: "bg-linear-to-r from-gray-200 to-gray-100/50 text-gray-600" };
    return { label: "", cls: "text-sky-blue" };
  };

  const tendenciaMap: Record<string, Record<string, string>> = {};
  tendencias.forEach((t) => {
    const mat = String(t.Matricula ?? t.Empl_matricula ?? "");
    const anio = String(t.Anio ?? "");
    if (!mat || !anio) return;
    if (!tendenciaMap[mat]) tendenciaMap[mat] = {};
    tendenciaMap[mat][anio] = t.Riesgo;
  });

  // Último riesgo designado del trabajador en ese año.
  // Se cruza por Empl_matricula (cruda), que es la que devuelve SCII_Indicadores.
  const getRiesgoAnio = (row: any, y: number): string =>
    tendenciaMap[String(row?.Empl_matricula ?? "")]?.[String(y)] ?? "";

  const aniosTendencia = Array.from({ length: new Date().getFullYear() - 2016 + 1 }, (_, i) => 2016 + i);

  // Mapa { matricula(cruda) -> Contrato } a partir de los registros (PLANTA / DOE / CORPORATIVO)
  const contratoMap: Record<string, string> = {};
  registros.forEach((r) => { if (r?.Empl_matricula != null) contratoMap[String(r.Empl_matricula)] = String(r.Contrato ?? ""); });

  // Serie por año con el conteo de cada estatus (opcionalmente filtrado por contrato)
  const buildTendenciaChart = (contrato?: string) =>
    aniosTendencia.map((y) => {
      let SANOS = 0, MODERADO = 0, ALTO = 0;
      tendencias.forEach((t) => {
        if (String(t.Anio) !== String(y)) return;
        if (contrato && contratoMap[String(t.Matricula)] !== contrato) return;
        const lab = riesgoAnioInfo(t.Riesgo).label;
        if (lab === "SANO") SANOS++;
        else if (lab === "MEDIO") MODERADO++;
        else if (lab === "ALTO") ALTO++;
      });
      return { anio: String(y), SANOS, "R. MODERADO": MODERADO, "R. ALTO": ALTO };
    });

  // Población evaluada por año, separada en PLANTA y DOE (matrículas distintas con toma ese año)
  // Población (plantilla real Planta/DOE) por TODOS los años, traída del backend (no depende del año seleccionado)
  const buildPoblacionChart = () =>
    aniosTendencia.map((y) => {
      const row = poblacion.find((p) => String(p.Anio) === String(y));
      return { anio: String(y), PLANTA: Number(row?.PLANTA ?? 0), DOE: Number(row?.DOE ?? 0) };
    });

  // Ausencias por año (registros marcados como FALTA), opcionalmente filtrado por contrato
  const buildAusenciasChart = (contrato?: string) =>
    aniosTendencia.map((y) => {
      let AUSENCIAS = 0;
      tendencias.forEach((t) => {
        if (String(t.Anio) !== String(y)) return;
        const c = t.Contrato ?? contratoMap[String(t.Matricula)];
        if (contrato && c !== contrato) return;
        if (riesgoAnioInfo(t.Riesgo).label === "FALTA") AUSENCIAS++;
      });
      return { anio: String(y), AUSENCIAS };
    });

  // Totales por mes del año seleccionado (para la gráfica de barras del año)
  const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const buildMensualChart = () =>
    [...mensualTotales]
      .sort((a, b) => Number(a.Mes) - Number(b.Mes))
      .map((m) => ({
        mes: nombresMeses[Number(m.Mes) - 1] ?? String(m.Mes),
        SANOS:         Number(m.SANOS ?? 0),
        "R. MODERADO": Number(m.MODERADO ?? m.R_MODERADO ?? 0),
        "R. ALTO":     Number(m.ALTO ?? m.R_ALTO ?? 0),
        AUSENCIAS:     Number(m.AUSENCIAS ?? 0),
      }));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res  = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ObtenerIndicadores`, {
          method: "POST",
          body:   JSON.stringify({ anio: selectedYear }),
        });

        const json = await res.json();

        if (json?.ok && Array.isArray(json.data)) {
          setRegistros(json.data);
        }
      } catch (err) {
        console.error("Error al obtener indicadores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  // Trae el último riesgo por trabajador y por año (vista Tendencia anual)
  useEffect(() => {
    const fetchTendencia = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ObtenerTendenciaAnual`, {
          method: "POST",
          body:   JSON.stringify({}),
        });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setTendencias(json.data);
        }
      } catch (err) {
        console.error("Error al obtener la tendencia anual:", err);
      }
    };
    fetchTendencia();
  }, []);

  // Población (Planta/DOE) por todos los años — no depende del año seleccionado
  useEffect(() => {
    const fetchPoblacion = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ObtenerPoblacionAnual`, {
          method: "POST",
          body:   JSON.stringify({}),
        });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setPoblacion(json.data);
        }
      } catch (err) {
        console.error("Error al obtener la población anual:", err);
      }
    };
    fetchPoblacion();
  }, []);

  // Totales por mes del año seleccionado (gráfica de barras del año)
  useEffect(() => {
    const fetchMensual = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ObtenerTotalesMensuales`, {
          method: "POST",
          body:   JSON.stringify({ anio: selectedYear }),
        });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setMensualTotales(json.data);
        }
      } catch (err) {
        console.error("Error al obtener totales mensuales:", err);
      }
    };
    fetchMensual();
  }, [selectedYear]);

  const currentYear = new Date().getFullYear();

  const filteredRegistros = registros.filter((r) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [r.Empl_Nombres, r.Matricula, r.Empl_matricula]
      .some((v) => v != null && String(v).toLowerCase().includes(q));
  });

  const sortedRegistros = [...filteredRegistros].sort((a, b) => {
    if (!sortCol || sortDir === "none") return 0;
    let va = "", vb = "";
    if (sortCol === "categoria") {
      va = a.IMC ? imcCategoria(parseFloat(a.IMC)) : "";
      vb = b.IMC ? imcCategoria(parseFloat(b.IMC)) : "";
    } else {
      va = a[sortCol] != null ? String(a[sortCol]?.$ ?? a[sortCol]) : "";
      vb = b[sortCol] != null ? String(b[sortCol]?.$ ?? b[sortCol]) : "";
    }
    const cmp = va.localeCompare(vb, "es", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  // const meses = [
  //   "Enero", "Febrero", "Marzo", "Abril",
  //   "Mayo", "Junio", "Julio", "Agosto",
  //   "Septiembre", "Octubre", "Noviembre", "Diciembre"
  // ];

  const meses = [
    { nombre: "Enero",      valor: "01" },
    { nombre: "Febrero",    valor: "02" },
    { nombre: "Marzo",      valor: "03" },
    { nombre: "Abril",      valor: "04" },
    { nombre: "Mayo",       valor: "05" },
    { nombre: "Junio",      valor: "06" },
    { nombre: "Julio",      valor: "07" },
    { nombre: "Agosto",     valor: "08" },
    { nombre: "Septiembre", valor: "09" },
    { nombre: "Octubre",    valor: "10" },
    { nombre: "Noviembre",  valor: "11" },
    { nombre: "Diciembre",  valor: "12" }
  ];

  const mesesMap: Record<string, string> = {
    Enero: "01",
    Febrero: "02",
    Marzo: "03",
    Abril: "04",
    Mayo: "05",
    Junio: "06",
    Julio: "07",
    Agosto: "08",
    Septiembre: "09",
    Octubre: "10",
    Noviembre: "11",
    Diciembre: "12",
  };

  const getMensual = (anio: number, matricula: string) => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res  = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ObtenerMensualAnio`, {
          method: "POST",
          body:   JSON.stringify({ anio, matricula }),
        });

        const json = await res.json();

        if (json?.ok && Array.isArray(json.data)) {
          setMensuales(json.data);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }

  // Reconstruye el detalle (misma vista que se abre al hacer clic en una fila)
  // a partir de la matrícula en la URL (/Indicadores/:matricula), para que sea
  // una ventana con su propia ruta y aparezca en el breadcrumb del Topbar.
  useEffect(() => {
    if (!matriculaParam) {
      setIsDetailOpen(false);
      setSelectedRow(null);
      return;
    }
    if (!registros.length) return;
    const row = registros.find((r) => String(r.Matricula) === matriculaParam || String(r.Empl_matricula) === matriculaParam);
    if (!row) return;
    const { pesoIdeal, pesoPerder, perderMes } = calcMetaPeso(row);
    setSelectedRow({ ...row, pesoIdeal, pesoPerder, perderMes });
    setIsDetailOpen(true);
    getMensual(selectedYear, row.Empl_matricula);
  }, [matriculaParam, registros, selectedYear]);

  const mensualPorMes = Array.from({ length: 12 }, (_, index) => {
    const registro = mensuales.find((m) => {
      const fecha = new Date(m.Fecha);
      return fecha.getMonth() === index;
    });

    if (registro) {
      console.log("Registro mensual:", registro);
    }

    return {
      mes: meses[index],
      data: registro || null
    };
  });

  // const mesesRegistrados = new Set(
  //   mensuales.map((x) => {
  //     const fecha = new Date(x.Fecha);
  //     return `${fecha.getFullYear()}-${String(
  //       fecha.getMonth() + 1
  //     ).padStart(2, "0")}`;
  //   })
  // );

  // const mesesRegistrados = new Set(
  //   mensuales.map((m) => {
  //     const fecha = new Date(m.Fecha);
  //     return String(fecha.getMonth() + 1).padStart(2, "0");
  //   })
  // );

  const mesesRegistrados = new Set(
    mensuales.map((m) => {
      const fecha = new Date(m.Fecha);
      return String(fecha.getMonth() + 1).padStart(2, "0");
    })
  );

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="fa-solid fa-check success-icon"></i><style> .success-icon { color: #545454; font-size: 90px; animation: pop 0.4s ease-out forwards, popPeriodic 4s ease-in-out 1.5s infinite; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } @keyframes popPeriodic { 0%, 85%, 100% { transform: scale(1); } 90% { transform: scale(1.15); } 95% { transform: scale(0.95); } } </style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });
  };

  const errorModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-exclamation aviso-exclamation"></i>
      <style>
        .aviso-exclamation {
          font-size: 90px;
          animation: shakeInitial 0.6s ease-in-out,
                     shakePeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes shakeInitial {
          0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
          40%  { transform: scale(1.05) rotate(10deg); }
          60%  { transform: scale(1.05) rotate(-7deg); }
          80%  { transform: scale(1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shakePeriodic {
          0%, 85%, 100% { transform: rotate(0deg); }
          87% { transform: rotate(-10deg); }
          89% { transform: rotate(10deg); }
          91% { transform: rotate(-8deg); }
          93% { transform: rotate(8deg); }
          95% { transform: rotate(-4deg); }
          97% { transform: rotate(4deg); }
        }
      </style>
      `,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validations = [
      { condition: !formData.talla?.trim(),  message: "Debe ingresar la <b>talla</b> del personal." },
      // { condition: !formData.peso?.trim(),   message: "Debe ingresar el <b>peso</b> del personal." },
      // { condition: !formData.imc?.trim(),    message: "Debe registrarse el <b>IMC</b> (se calcula con talla y peso)." },
      { condition: !formData.riesgo?.trim(), message: "Debe seleccionar el <b>riesgo</b> del personal." },
    ];

    const error = validations.find(v => v.condition);
    if (error) { errorModal("Campos requeridos", error.message); return; }

    try {
      setSaving(true);

      // Los campos numéricos opcionales vacíos se envían como null (SQL no convierte "" a numeric)
      const num = (v: string) => (v != null && v.trim() !== "" ? v.trim() : null);

      const endpoint = isEditingMensual ? "ActualizarIndicadores" : "GuardarIndicadores";
      const res = await fetchWithAuth(`${API_BASE_URL}/Indicadores/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({
          payload: {
            matricula: formData.matricula,
            registro: {
              sistolica:     num(formData?.sistolica),
              diastolica:    num(formData?.diastolica),
              glucosa:       num(formData?.glucosa),
              colesterol:    num(formData?.colesterol),
              trigliceridos: num(formData?.trigliceridos),
              peso:          num(formData?.peso),
              altura:        num(formData?.talla),
              pa:            num(formData?.pa),
              imc:           num(formData?.imc),
              ict:           num(formData?.ict),
              riesgo:        num(formData?.riesgo),
              fecha:         `${formData.mes}-01`,
            },
          },
        }),
      });

      const data = await res.json();

      if (data?.ok) {
        const mensaje = isEditingMensual ? "Se ha actualizado el registro correctamente." : "Se ha registrado la toma de indicadores correctamente.";
        exitoModal("Éxito", mensaje);
        setIsProgramarOpen(false);
        setIsPanelOpen(false);
        setIsEditingMensual(false);
        setFormData({ matricula: "", mes: "", talla: "", peso: "", imc: "", pa: "", ict: "", riesgo: "", sistolica: "", diastolica: "", glucosa: "", colesterol: "", trigliceridos: "" });
        if (selectedRow?.Empl_matricula) getMensual(selectedYear, selectedRow.Empl_matricula);
      } else {
        errorModal("Error al guardar", "No se pudo registrar la toma de indicadores. Intente nuevamente.");
      }
    } catch (err) {
      console.error("Error al guardar indicadores:", err);
      errorModal("Error al guardar", "Ocurrió un error de conexión al registrar la toma.");
    } finally {
      setSaving(false);
    }
  };

  const handleMesChange = (value: string) => {
    if (mesesRegistrados.has(value)) {
      // Swal.fire({
      //   icon: "warning",
      //   title: "Mes ya registrado",
      //   text: "Ya existe una toma para ese mes."
      // });
      alert("Ya existe una toma para ese mes.");
      return;
    }

    setFormData(f => ({
      ...f,
      mes: value
    }));
  };

  // Exporta el Check-up del año generando el Excel desde la plantilla (backend)
  const handleExportar = async () => {
    try {
      setExportando(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/Indicadores/ExportarCheckUp`, {
        method: "POST",
        body: JSON.stringify({ anio: selectedYear }),
      });

      if (!res.ok) {
        errorModal("Error al exportar", "No se pudo generar el archivo de Excel.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Check-up Personal Confianza ${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar check-up:", err);
      errorModal("Error al exportar", "Ocurrió un error de conexión al generar el Excel.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 pb-0 flex flex-col gap-6" style={isDetailOpen ? undefined : { height: pageHeight }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl shadow-xs shadow-restore gap-4 shrink-0">
            <div>
              {isDetailOpen ? (
                <>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent flex items-center">
                    {selectedRow ? selectedRow.Empl_Nombres : (
                      <span className="inline-block h-7 w-56 rounded-md bg-gray-200 animate-pulse"></span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRow ? (
                      <>Matrícula: <b>{selectedRow.Matricula}</b> | Contrato: <b>{selectedRow.Contrato}</b> | Depto.: <b>{selectedRow.Departamento}</b></>
                    ) : (
                      <span className="inline-block h-4 w-72 rounded bg-gray-100 animate-pulse"></span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent flex items-center">
                      Indicadores TNG Sano
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Control general de indicadores del personal de confianza
                    </p>
                  </div>
                </>
              )}
            </div>
            {isDetailOpen ? (
              <></>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportar}
                  disabled={exportando}
                  // title="Exportar a Excel"
                  className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0 hidden"
                >
                  <i className={`fa-solid ${exportando ? "fa-spinner fa-spin" : "fa-file-excel"} mr-2`}></i>
                  {exportando ? "Generando..." : "Exportar"}
                </button>
                <div className="relative w-35">
                  <i className="fa-solid fa-calendar-days absolute left-3 top-1/2 -translate-y-1/2 text-sea-blue text-base pointer-events-none" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full appearance-none bg-linear-to-r from-gray-50 to-gray-100 text-sea-blue pl-10 pr-10 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                  >
                    {Array.from({ length: currentYear - 2016 + 1 }, (_, i) => 2016 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-sea-blue pointer-events-none"></i>
                </div>
              </div>
            )}
            {MOSTRAR_BOTON_CARNET && isDetailOpen && selectedRow && (
              <button
                onClick={() => setIsCarnetOpen(true)}
                className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-magnifying-glass mr-2"></i>
                Ver Carnet
              </button>
            )}
          </div>

          {isDetailOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-6 shrink-0">
              <div className={`lg:col-span-1`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                      <i className="fa-solid fa-person text-sea-blue mr-4"></i>
                      Índice Corporal Inicial
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <KpiCard
                      icon="venus-mars"
                      label="Edad / Sexo"
                      value={selectedRow ? (selectedRow.Sexo ? ((calcEdadEnAnio(selectedRow.FechaNacimiento, selectedYear) ?? selectedRow.Edad) + ` / ` + selectedRow.Sexo) : "N/A") : <span className="inline-block h-5 w-16 rounded bg-gray-200 animate-pulse"></span>}
                    />
                    <KpiCard
                      icon="ruler-vertical"
                      label="Talla"
                      value={selectedRow ? (selectedRow.Altura ?? "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse"></span>}
                    />
                    <KpiCard
                      icon="weight-scale"
                      label="Peso Inicial"
                      value={selectedRow ? (selectedRow.Peso ?? "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse"></span>}
                    />
                    <KpiCard
                      icon="scale-balanced"
                      label="IMC"
                      value={selectedRow ? (selectedRow.IMC ?? "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse"></span>}
                    />
                  </div>

                  <div className={`bg-linear-to-b from-blue-50 to-white rounded-xl border border-horz-blue/20 shadow-xs mt-4 p-4`}>
                    <h2 className="text-sm font-bold flex items-center">
                      <i className="fa-solid fa-bullseye mr-3"></i>
                      Para cumplimiento de meta
                    </h2>
                    <div className="grid grid-cols-3 mt-1 gap-2">
                      <div className="text-center">
                        <p className="text-[10px] font-medium tracking-wide truncate">
                          {selectedRow ? (Number(selectedRow.pesoPerder) > 0 ? "Total a ganar" : "Total a perder") : <span className="inline-block h-2.5 w-16 rounded bg-gray-200 animate-pulse"></span>}
                        </p>
                        <h2 className="text-xl font-bold leading-tight">
                          {selectedRow ? (selectedRow.pesoPerder ? <>{selectedRow.pesoPerder} <span className="text-sm">kg</span></> : "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse mt-1"></span>}
                        </h2>
                      </div>
                      <div className="px-2 text-center border-l border-r border-sky-blue/40">
                        <p className="text-[10px] font-medium tracking-wide truncate">
                          Meta por mes
                        </p>
                        <h2 className="text-xl font-bold leading-tight">
                          {selectedRow ? (selectedRow.perderMes && selectedRow.pesoPerder ? <>{selectedRow.perderMes && Number(selectedRow.perderMes) > 0 ? (Number(selectedRow.pesoPerder) / Number(selectedRow.perderMes)).toFixed(2) : "—"} <span className="text-sm">kg</span></> : "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse mt-1"></span>}
                        </h2>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium tracking-wide truncate">
                          Meta final
                        </p>
                        <h2 className="text-xl font-bold leading-tight">
                          {selectedRow ? (selectedRow.pesoIdeal ? <>{selectedRow.pesoIdeal.toFixed(2)} <span className="text-sm">kg</span></> : "N/A") : <span className="inline-block h-5 w-12 rounded bg-gray-200 animate-pulse mt-1"></span>}
                        </h2>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className={`lg:col-span-1`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                      <i className="fa-solid fa-hand-holding-medical text-sea-blue mr-4"></i>
                      Toma Inicial de Indicadores
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 py-2.5 px-3 text-gray-700 rounded-xl shadow-xs transition-colors duration-200">
                    <div className={`lg:col-span-2`}>
                      <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                        <div className="size-6 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center shrink-0 mr-3">
                          <i className="fa-solid fa-ruler-horizontal text-white text-[10px]"></i>
                        </div>
                        Perímetro Abdominal
                      </h2>
                    </div>
                    <div className={`lg:col-span-1 text-right`}>
                      <h2 className="text-sm text-right mr-3 font-bold min-w-0 w-full">
                        {selectedRow ? (selectedRow.PA ? selectedRow.PA + ' cm' : "N/A") : <span className="inline-block h-4 w-12 rounded bg-gray-200 animate-pulse"></span>}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 py-2.5 px-3 text-gray-700 rounded-xl shadow-xs transition-colors duration-200">
                    <div className={`lg:col-span-2`}>
                      <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                        <div className="size-6 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center shrink-0 mr-3">
                          <i className="fa-solid fa-droplet text-white text-[10px]"></i>
                        </div>
                        Glucosa
                      </h2>
                    </div>
                    <div className={`lg:col-span-1 text-right`}>
                      <h2 className="text-sm text-right mr-3 font-bold min-w-0 w-full">
                        {selectedRow ? (selectedRow.Glucosa ? selectedRow.Glucosa + ' mg/dL' : "N/A") : <span className="inline-block h-4 w-12 rounded bg-gray-200 animate-pulse"></span>}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 py-2.5 px-3 text-gray-700 rounded-xl shadow-xs transition-colors duration-200">
                    <div className={`lg:col-span-2`}>
                      <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                        <div className="size-6 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center shrink-0 mr-3">
                          <i className="fa-solid fa-flask text-white text-[10px]"></i>
                        </div>
                        Colesterol
                      </h2>
                    </div>
                    <div className={`lg:col-span-1 text-right`}>
                      <h2 className="text-sm text-right mr-3 font-bold min-w-0 w-full">
                        {selectedRow ? (selectedRow.Colesterol ? (/[a-zA-Z]/.test(String(selectedRow.Colesterol)) ? selectedRow.Colesterol : selectedRow.Colesterol + ' mg/dL') : "N/A") : <span className="inline-block h-4 w-12 rounded bg-gray-200 animate-pulse"></span>}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 py-2.5 px-3 text-gray-700 rounded-xl shadow-xs transition-colors duration-200">
                    <div className={`lg:col-span-2`}>
                      <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                        <div className="size-6 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center shrink-0 mr-3">
                          <i className="fa-solid fa-atom text-white text-[10px]"></i>
                        </div>
                        Triglicéridos
                      </h2>
                    </div>
                    <div className={`lg:col-span-1 text-right`}>
                      <h2 className="text-sm text-right mr-3 font-bold min-w-0 w-full">
                        {selectedRow ? (selectedRow.Trigliceridos ? selectedRow.Trigliceridos + ' mg/dL' : "N/A") : <span className="inline-block h-4 w-12 rounded bg-gray-200 animate-pulse"></span>}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 py-2.5 px-3 text-gray-700 rounded-xl shadow-xs transition-colors duration-200">
                    <div className={`lg:col-span-2`}>
                      <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                        <div className="size-6 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center shrink-0 mr-3">
                          <i className="fa-solid fa-heart-pulse text-white text-[10px]"></i>
                        </div>
                        Tensión Arterial (TA)
                      </h2>
                    </div>
                    <div className={`lg:col-span-1 text-right`}>
                      <h2 className="text-sm text-right mr-3 font-bold min-w-0 w-full">
                        {selectedRow ? (selectedRow.Sistolica && selectedRow.Diastolica ? selectedRow.Sistolica + " / " + selectedRow.Diastolica : "") : <span className="inline-block h-4 w-12 rounded bg-gray-200 animate-pulse"></span>}
                      </h2>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className={`lg:col-span-1`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6 flex flex-col`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                      <i className="fa-solid fa-chart-pie text-sea-blue mr-4"></i>
                      Progreso Real Acumulado
                    </h2>
                  </div>

                  {!selectedRow ? (
                    <div className="flex-1 flex flex-col items-center justify-center mt-4">
                      <div className="relative w-40 h-40 rounded-full bg-gray-100 animate-pulse"></div>
                      <div className="grid grid-cols-2 gap-2 w-full mt-4">
                        <div className="text-center space-y-1.5">
                          <div className="h-2.5 w-20 mx-auto rounded bg-gray-200 animate-pulse"></div>
                          <div className="h-5 w-14 mx-auto rounded bg-gray-200 animate-pulse"></div>
                        </div>
                        <div className="text-center space-y-1.5 border-l border-gray-100">
                          <div className="h-2.5 w-20 mx-auto rounded bg-gray-200 animate-pulse"></div>
                          <div className="h-5 w-14 mx-auto rounded bg-gray-200 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ) : (() => {
                    const pesoInicial = selectedRow.Peso ? Number(selectedRow.Peso) : null;
                    const metaPerder = selectedRow.pesoPerder ? Number(selectedRow.pesoPerder) : null;

                    const registrosConPeso = mensuales.filter((m) => m.Peso != null && m.Peso !== "").sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

                    const pesoActual = registrosConPeso.length ? Number(registrosConPeso[registrosConPeso.length - 1].Peso) : pesoInicial;

                    // Dirección del plan: positivo => debe subir de peso (negativo => debe bajar)
                    const debeSubir = metaPerder != null && metaPerder > 0;
                    const metaAbs = metaPerder != null ? Math.abs(metaPerder) : null;

                    // Avance en la dirección de la meta (positivo = bien)
                    const kgEnDireccion = (pesoInicial != null && pesoActual != null)
                      ? (debeSubir ? pesoActual - pesoInicial : pesoInicial - pesoActual)
                      : 0;

                    const porcentaje = (metaAbs && metaAbs > 0) ? Math.max(-100, Math.min(100, (kgEnDireccion / metaAbs) * 100)) : 0;

                    const malo = kgEnDireccion < 0; // se movió en contra del objetivo
                    const arcPct = Math.min(100, Math.abs(porcentaje));

                    const r = 54;
                    const C = 2 * Math.PI * r;
                    const offset = C * (1 - arcPct / 100);

                    return (
                      <div className="flex-1 flex flex-col items-center justify-center mt-4">
                        <div className="relative w-40 h-40">
                          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                            <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
                            <circle
                              cx="70" cy="70" r={r} fill="none"
                              stroke={malo ? "url(#progGradNeg)" : "url(#progGrad)"} strokeWidth="14" strokeLinecap="round"
                              strokeDasharray={C} strokeDashoffset={offset}
                              className="transition-all duration-700"
                            />
                            <defs>
                              <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#002E6D" />
                                <stop offset="100%" stopColor="#009BDE" />
                              </linearGradient>
                              <linearGradient id="progGradNeg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#dc2626" />
                                <stop offset="100%" stopColor="#f87171" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-bold ${malo ? "text-red-500" : "text-sea-blue"}`}>{porcentaje.toFixed(0)}%</span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {/* {gano ? "de retroceso" : "de avance"} */}
                              de avance
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 w-full mt-4">
                          <div className="text-center">
                            <p className="text-[10px] font-medium text-gray-400 tracking-wide">{debeSubir ? "Total ganado" : "Total perdido"}</p>
                            <h2 className={`text-lg font-bold leading-tight ${malo ? "text-red-500" : "text-gray-800"}`}>
                              {kgEnDireccion.toFixed(2)} <span className="text-xs">kg</span>
                            </h2>
                          </div>
                          <div className="text-center border-l border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 tracking-wide">{debeSubir ? "Meta a ganar" : "Meta a perder"}</p>
                            <h2 className="text-lg font-bold text-gray-800 leading-tight">
                              {metaAbs != null ? metaAbs.toFixed(2) : "N/A"} <span className="text-xs">kg</span>
                            </h2>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white rounded-xl shadow-xs p-6 mb-1 flex flex-col ${isDetailOpen ? "" : "overflow-hidden flex-1 min-h-0"}`}
          >
            {isDetailOpen ? (
              selectedRow ? (
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="fa-solid fa-clock-rotate-left text-sea-blue mr-3"></i>
                    Seguimiento Mensual
                  </h2>
                  {(() => {
                    const cumplidos = mensualPorMes.filter(({ data }) => data && data.Riesgo !== "Falta").length;
                    return (
                      <span className="text-xs font-bold text-gray-400">
                        {cumplidos} / 12 cumplidos
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {mensualPorMes.map(({ mes, data }, idx) => {
                    // Plan de pérdida de peso
                    const pesoInicialPlan = selectedRow?.Peso ? Number(selectedRow.Peso) : null;
                    const metaFinalPlan = selectedRow?.pesoIdeal != null ? Number(selectedRow.pesoIdeal) : null;
                    const kgPorMes = (selectedRow?.pesoPerder && selectedRow?.perderMes && Number(selectedRow.perderMes) > 0)
                      ? Number(selectedRow.pesoPerder) / Number(selectedRow.perderMes)
                      : null;
                    // Meta del mes: Enero = peso inicial y cada mes avanza kgPorMes hacia la meta final
                    // (kgPorMes negativo => baja de peso; positivo => sube), sin pasar la meta final.
                    const rawMetaMes = (pesoInicialPlan != null && kgPorMes != null) ? pesoInicialPlan + idx * kgPorMes : null;
                    const metaMes = rawMetaMes == null ? null
                      : metaFinalPlan == null ? rawMetaMes
                      : kgPorMes! < 0 ? Math.max(metaFinalPlan, rawMetaMes)
                      : Math.min(metaFinalPlan, rawMetaMes);

                    // Comparativa de peso contra el último mes con registro (o el peso inicial)
                    let pesoPrev = pesoInicialPlan;
                    for (let j = idx - 1; j >= 0; j--) {
                      if (mensualPorMes[j].data?.Peso) { pesoPrev = Number(mensualPorMes[j].data.Peso); break; }
                    }
                    const pesoMes = data?.Peso ? Number(data.Peso) : null;
                    const bajo  = pesoMes != null && pesoPrev != null && pesoMes < pesoPrev;
                    const subio = pesoMes != null && pesoPrev != null && pesoMes > pesoPrev;

                    // Dirección del plan: positivo => debe subir de peso (negativo => debe bajar)
                    const debeSubir = selectedRow?.pesoPerder != null && Number(selectedRow.pesoPerder) > 0;
                    const mejoro  = debeSubir ? subio : bajo;
                    const empeoro = debeSubir ? bajo : subio;

                    return (
                    <div
                      key={idx}
                      className="lg:col-span-1 rounded-md shadow-xs p-6"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold">
                          {data ? (
                            <button
                              onClick={() => {
                                const mesFormateado = `${selectedYear}-${mes.valor}`;
                                const str = (v: any) => (v != null && v !== "" ? String(v) : "");
                                setFormData(f => ({
                                  ...f,
                                  mes: mesFormateado,
                                  matricula: selectedRow?.Empl_matricula ?? "",
                                  talla: str(selectedRow?.Altura),
                                  peso: str(data.Peso),
                                  pa: str(data.PA),
                                  imc: str(data.IMC),
                                  riesgo: str(data.IdRiesgo),
                                  sistolica: str(data.Sistolica),
                                  diastolica: str(data.Diastolica),
                                  glucosa: str(data.Glucosa),
                                  colesterol: str(data.Colesterol),
                                  trigliceridos: str(data.Trigliceridos),
                                }));
                                setIsEditingMensual(true);
                                setIsProgramarOpen(true);
                              }}
                              className="flex items-center gap-2 px-2 p-1.5 rounded-xl text-gray-600 hover:text-sea-blue hover:bg-sea-blue/10 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <i className="fa-solid fa-pencil text-sm"></i>
                              <span className="text-sm">{mes.nombre}</span>
                            </button>
                          ) : (
                            <>
                              <i className="fa-solid fa-calendar-days mr-2"></i>
                              {mes.nombre}
                            </>
                          )}
                        </h2>
                        <div className="flex items-center gap-2">
                          {data?.Riesgo && (
                            <span className={`px-2 py-1 rounded-lg uppercase text-[9px] font-semibold bg-linear-to-r ${data.IdRiesgo == 1 ? "from-aqua-green/30 to-aqua-green/10 text-green-900" : data.IdRiesgo == 2 ? "from-sunray-yellow/30 to-sunray-yellow/10 text-yellow-600" : data.IdRiesgo == 3 ? "from-red-200 to-red-100/50 text-red-600" : "from-gray-200 to-gray-100/50 text-gray-600"}`}>
                              {data.Riesgo}
                            </span>
                          )}
                        </div>
                      </div>
                  
                      {data ? (
                        <>
                        <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                          <div className="flex justify-between text-gray-400">
                            <i className="font-regular">Meta del mes</i>
                            <strong><i>{metaMes != null ? `${metaMes.toFixed(2)} kg` : "-"}</i></strong>
                          </div>

                          <div className="flex justify-between">
                            <p>Peso del mes</p>
                            <strong className="flex items-center gap-1">
                              {(bajo || subio) && (
                                <i className={`fa-solid ${bajo ? "fa-arrow-trend-down" : "fa-arrow-trend-up"} ${mejoro ? "text-aqua-green" : "text-red-500"}`}></i>
                              )}
                              {data.Peso ? `${data.Peso} kg` : "N/A"}
                            </strong>
                          </div>

                          <div className="flex justify-between">
                            <p>P. abdominal (PA)</p>
                            <strong>{data.PA ? `${data.PA} cm` : "-"}</strong>
                          </div>

                          <div className="flex justify-between">
                            <p>IMC</p>
                            <strong>{data.IMC ? data.IMC : "-"}</strong>
                          </div>

                          {/* <div className="flex justify-between">
                            <p>ICT</p>
                            <strong>{data.ICT ? data.ICT : "-"}</strong>
                          </div> */}
                        </div>

                        {(() => {
                          // Avance mensual = cambio de peso en la dirección de la meta (mismo peso => 0)
                          const avance = (pesoPrev != null && pesoMes != null) ? (debeSubir ? pesoMes - pesoPrev : pesoPrev - pesoMes) : null;
                          const estado = mejoro ? "mejoro" : empeoro ? "empeoro" : "igual";
                          const boxCls = estado === "mejoro" ? "bg-aqua-green/10 text-aqua-green" : estado === "empeoro" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500";
                          const circleCls = estado === "mejoro" ? "bg-aqua-green text-white" : estado === "empeoro" ? "bg-red-500 text-white" : "bg-gray-400 text-white";
                          // La flecha indica el movimiento real del peso (bajó/subió); el color indica si mejoró o empeoró
                          const arrow = bajo ? "fa-arrow-down" : subio ? "fa-arrow-up" : "fa-equals";
                          return (
                            <div className={`flex items-center justify-between mt-3 px-3 py-2 rounded-lg ${boxCls}`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 pl-[1px] rounded-full flex items-center justify-center ${circleCls}`}>
                                  <i className={`fa-solid ${arrow} text-[11px]`}></i>
                                </span>
                                <span className="text-[11px] font-medium">
                                  Avance mensual
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <strong className="text-xs">
                                  {avance != null ? `${avance.toFixed(2)} kg` : "-"}
                                </strong>
                                {/* <i className={`mdi ${arrow} text-sm`}></i> */}
                              </div>
                            </div>
                          );
                        })()}
                        </>
                      ) : (
                        <div className="mt-2 h-32 text-center text-gray-400">
                          {/* <div className="flex justify-between text-xs text-slate-600 border-b border-gray-100 py-1.5">
                            <p>Meta del mes</p>
                            <strong>{metaMes != null ? `${metaMes.toFixed(2)} kg` : "-"}</strong>
                          </div> */}
                          <div className="flex justify-center text-[11px] pt-8 py-1.5">
                            <p>Toma de datos pendiente</p>
                          </div>
                          <button
                            // onClick={() => {
                            //   setMesSeleccionado(mes);
                            //   setIsProgramarOpen(true);
                            // }}
                            onClick={() => {
                              const mesFormateado = `${selectedYear}-${mes.valor}`;
                              const str = (v: any) => (v != null && v !== "" ? String(v) : "");
                              // La talla no cambia: se precarga con la del registro
                              const talla = str(selectedRow?.Altura);
                              setFormData({
                                matricula: selectedRow?.Empl_matricula ?? "",
                                mes: mesFormateado,
                                talla,
                                peso: "",
                                imc: "",
                                pa: "",
                                ict: "",
                                riesgo: "",
                                sistolica: str(selectedRow?.Sistolica),
                                diastolica: str(selectedRow?.Diastolica),
                                glucosa: str(selectedRow?.Glucosa),
                                colesterol: str(selectedRow?.Colesterol),
                                trigliceridos: str(selectedRow?.Trigliceridos),
                              });
                              setMesSeleccionado(mes.valor);
                              setIsPanelOpen(false);
                              setIsEditingMensual(false);
                              setIsProgramarOpen(true);
                            }}
                            className="text-xs font-semibold hover:text-sea-blue cursor-pointer"
                          >
                            <i className="fa-solid fa-plus mr-2"></i>
                            Registrar toma
                          </button>
                          
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                    <div className="h-4 w-48 rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-3 w-20 rounded bg-gray-200 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="lg:col-span-1 rounded-md shadow-xs p-6 animate-pulse">
                        <div className="h-4 w-20 rounded bg-gray-200 mb-3"></div>
                        <div className="space-y-2">
                          <div className="h-3 rounded bg-gray-100"></div>
                          <div className="h-3 rounded bg-gray-100"></div>
                          <div className="h-3 rounded bg-gray-100"></div>
                        </div>
                        <div className="h-8 rounded-lg bg-gray-100 mt-3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-4 shrink-0 flex-wrap">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className={`fa-solid ${selectedView === "checkUp" ? "fa-heart-pulse" : selectedView === "graficas" ? "fa-chart-line" : "fa-clock-rotate-left"} text-sea-blue mr-3`}></i>
                    {selectedView === "checkUp" ? "Indicadores" : selectedView === "graficas" ? "Gráficas Poblacionales" : "Tendencia de Salud Anual"}
                  </h2>

                  {MOSTRAR_TABS_VISTA && (
                    <div className="flex items-center gap-1 bg-white border border-gray-50 shadow-xs rounded-lg p-1">
                      <button
                        onClick={() => setSelectedView("checkUp")}
                        // title="Vista Check-up"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${selectedView === "checkUp" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                      >
                        <i className="fa-solid fa-heart-pulse"></i>
                        Check-up
                      </button>
                      <button
                        onClick={() => setSelectedView("graficas")}
                        // title="Gráficas"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${selectedView === "graficas" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                      >
                        <i className="fa-solid fa-chart-line"></i>
                        Gráficas
                      </button>
                      <button
                        onClick={() => setSelectedView("anual")}
                        // title="Tendencia de salud anual"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${selectedView === "anual" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                      >
                        <i className="fa-solid fa-clock-rotate-left"></i>
                        Tendencia
                      </button>
                    </div>
                  )}
                </div>

                {selectedView === "checkUp" ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="relative bg-white rounded-lg shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
                      {loading ? (
                        <div className="flex-1 min-h-0 overflow-auto rounded-lg">
                          <IndicadoresTablaSkeleton />
                        </div>
                      ) : (
                      <div className="flex-1 min-h-0 overflow-auto rounded-lg">
                        <table className="table-fixed w-full text-xs">
                          <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="text-gray-700 text-left">
                              <th className="px-2 py-3 pl-6 text-left font-semibold text-gray-600 whitespace-nowrap hidden">
                                Contrato
                              </th>
                              {([
                                { col: "Matricula",       label: "Matrícula",         icon: "fa-brands fa-slack", cls: "px-5 py-3 text-left w-[110px]", align: "justify-start", sortable: true  },
                                { col: "Empl_Nombres",    label: "Nombre",            icon: "fa-solid fa-user",   cls: "px-5 py-3 text-left",         align: "justify-start",  sortable: true  },
                                { col: "FechaNacimiento", label: "Fecha\nnacimiento", icon: "fa-cake-candles",    cls: "py-3 text-center w-24 hidden", align: "justify-center", sortable: true },
                                { col: "Edad",            label: "Edad",              icon: "fa-cake-candles",    cls: "px-3 py-3 text-center w-24", align: "justify-center", sortable: true  },
                                { col: "Sexo",            label: "Sexo",              icon: "fa-venus-mars",      cls: "px-3 py-3 text-center w-20", align: "justify-center", sortable: true  },
                                { col: "Altura",          label: "Talla",             icon: "fa-ruler-vertical",  cls: "px-3 py-3 text-center w-24", align: "justify-center", sortable: true  },
                                { col: "Peso",            label: "Peso",              icon: "fa-weight-scale",    cls: "px-3 py-3 text-center w-24", align: "justify-center", sortable: true  },
                                { col: "IMC",             label: "IMC",               icon: "fa-scale-balanced",  cls: "px-3 py-3 text-center w-24", align: "justify-center", sortable: true  },
                              ] as { col: SortCol; label: string; icon: string; cls: string; align: string; sortable: boolean }[]).map(({ col, label, icon, cls, align, sortable }) => {
                                const active = sortable && sortCol === col && sortDir !== "none";
                                return (
                                  <th key={label}
                                    onClick={sortable && col ? () => cycleSort(col) : undefined}
                                    className={`${cls} font-semibold text-gray-700 ${sortable ? "cursor-pointer select-none group" : ""}`}>
                                    <span className={`flex items-center ${align} gap-1`}>
                                      <i className={`${icon.includes(" ") ? icon : `fa-solid ${icon}`} text-[10px] text-gray-400 group-hover:text-gray-500 mr-1`}></i>
                                      <span>{label.includes("\n") ? <>{label.split("\n")[0]}<br/>{label.split("\n")[1]}</> : label}</span>
                                      {sortable && <i className={`fa-solid ${sortIcon(col)} text-[10px] transition-colors ${active ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`} />}
                                    </span>
                                  </th>
                                );
                              })}
                              <th className="py-3 text-left font-semibold text-gray-700 hidden">
                                Meta final<br></br>(peso)
                              </th>
                              <th className="py-3 text-left font-semibold text-gray-700 hidden">
                                Total kg<br></br>a perder
                              </th>
                              <th className="py-3 text-left font-semibold text-gray-700 w-16 hidden">
                                Periodo<br></br>(meses)
                              </th>
                              <th className="py-3 text-left font-semibold text-gray-700 w-18 hidden">
                                Kg perder<br></br>por mes
                              </th>
                              <th
                                onClick={() => cycleSort("categoria")}
                                className="px-3 py-3 text-left w-48 font-semibold text-gray-700 cursor-pointer select-none group"
                              >
                                <span className="flex items-center justify-start gap-1">
                                  <i className="fa-solid fa-tags text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                                  <span>Categoría (OMS)</span>
                                  <i className={`fa-solid ${sortIcon("categoria")} text-[10px] transition-colors ${sortCol === "categoria" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`} />
                                </span>
                              </th>
                              <th className="w-10 pr-3 py-3 text-right">
                                <i
                                  onClick={(e) => { e.stopPropagation(); setShowFiltros((v) => !v); }}
                                  title={showFiltros ? "Ocultar filtros" : "Mostrar filtros"}
                                  className={`fa-solid ${showFiltros ? "fa-filter-circle-xmark" : "fa-filter"} cursor-pointer text-xs transition-colors ${showFiltros || busqueda ? "text-sea-blue" : "text-gray-300 hover:text-gray-400"}`}
                                ></i>
                              </th>
                            </tr>
                            {showFiltros && (
                              <tr className="bg-gray-50 text-left h-11">
                                <td colSpan={2} className="px-5 py-2">
                                  <div className="relative w-72">
                                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                    <input
                                      type="text"
                                      value={busqueda}
                                      onChange={(e) => setBusqueda(e.target.value)}
                                      placeholder="Buscar por nombre o matrícula"
                                      className="w-full h-7 pl-8 pr-7 py-1 rounded-md text-xs shadow-xs bg-white outline-none focus:ring-1 focus:ring-sea-blue"
                                    />
                                    {busqueda && (
                                      <button
                                        type="button"
                                        onClick={() => setBusqueda("")}
                                        title="Limpiar"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                      >
                                        <i className="fa-solid fa-circle-xmark text-xs"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td colSpan={6}></td>
                                <td className="w-10 pr-3"></td>
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {sortedRegistros.map((row, idx) => {
                              const { pesoIdeal, pesoPerder, perderMes } = calcMetaPeso(row);

                              return (
                                <motion.tr
                                  initial={{ opacity: 0, y: -1 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2 }}
                                  key={idx}
                                  onClick={() => navigate(`/Indicadores/${encodeURIComponent(row.Matricula)}`, { state: { nombre: row.Empl_Nombres } })}
                                  className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                                >
                                  <td className="px-2 pl-6 py-1.5 text-gray-700 break-words hidden">
                                    {row.Contrato}
                                  </td>
                                  {/* <td className="px-2 pl-6 py-1.5 text-gray-700 break-words">
                                    {row.Departamento}
                                  </td> */}
                                  <td className="px-5 py-0 text-left font-medium text-gray-700">
                                    <p className="text-[12px] font-bold uppercase text-gray-600 block truncate group-hover:text-sea-blue transition-colors">
                                      {row.Matricula}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">
                                      {row.Contrato == "CORPORATIVO" ? "" : row.Contrato}
                                    </p>
                                  </td>
                                  <td className="px-5 py-0">
                                    <p className="text-[12px] font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">
                                      {row.Empl_Nombres}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">
                                      {row.Departamento}
                                    </p>
                                  </td>
                                  <td className="px-2 py-1.5 text-center font-medium text-gray-700 mb-1 hidden">
                                    {row.FechaNacimiento ? (() => { const [y,m,d] = String(row.FechaNacimiento).split("T")[0].split("-"); return `${d}-${m}-${y}`; })() : ""}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 mb-1 group-hover:font-semibold transition-all">
                                    {calcEdadEnAnio(row.FechaNacimiento, selectedYear) ?? row.Edad}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 mb-1 group-hover:font-semibold transition-all">
                                    {row.Sexo}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 mb-1 group-hover:font-semibold transition-all">
                                    {row.Altura}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 mb-1 group-hover:font-semibold transition-all">
                                    {row.Peso}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 mb-1 group-hover:font-semibold transition-all">
                                    {row.Peso && row.Altura ? row.IMC ?? (row.Peso / (row.Altura * row.Altura)) : ""}
                                  </td>
                                  <td className="px-1 py-1.5 text-left font-medium text-gray-700 italic mb-1 hidden">
                                    {pesoIdeal?.toFixed(2)}
                                  </td>
                                  <td className="px-1 py-1.5 text-left font-semibold whitespace-nowrap hidden">
                                    <span className={`${pesoPerder ? Number(pesoPerder) < 0 ? "text-red-400" : "text-gray-700" : ""}`}>
                                      {pesoPerder}
                                    </span>
                                  </td>
                                  <td className="px-1 py-1.5 text-left font-medium text-gray-700 mb-1 hidden">
                                    {perderMes}
                                  </td>
                                  <td className="px-1 py-1.5 text-left font-medium text-gray-700 mb-1 hidden">
                                    {pesoPerder && perderMes && Number(perderMes) > 0 ? (Number(pesoPerder) / Number(perderMes)).toFixed(2) : ""}
                                  </td>
                                  <td className="px-3 py-2 text-left font-bold text-gray-700">
                                    {(() => {
                                      const imc = parseFloat(row.IMC);
                                      if (!imc || imc <= 0) return null;
                                      const [label, icon, color] =
                                        imc <= 24.99 ? ["Normal", "circle-check", "text-aqua-green"]
                                        : imc <= 29.99 ? ["Sobrepeso", "circle-exclamation", "text-yellow-600"]
                                        : imc <= 34.99 ? ["Obesidad Gr. I", "triangle-exclamation", "text-sunset-orange"]
                                        : imc <= 39.99 ? ["Obesidad Gr. II", "triangle-exclamation", "text-red-600"]
                                        : ["Obesidad Gr. III", "triangle-exclamation", "text-red-600"];
                                      return (
                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                          <i className={`fa-solid fa-${icon} ${color} text-xs shrink-0`}></i>
                                          {label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="w-10 pr-3 py-2 whitespace-nowrap text-right text-gray-400 group-hover:text-sea-blue transition-colors">
                                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                                  </td>
                                </motion.tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                  </div>
                ) : selectedView === "graficas" ? (
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
                    <div className={`lg:col-span-2`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`bg-linear-to-b from-white to-gray-50 mt-4 rounded-xl h-full shadow-xs p-6 pb-0`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold text-gray-800 flex items-center">
                            <i className="fa-solid fa-users text-sea-blue mr-4"></i>
                            Población TNG Sano
                          </h2>
                        </div>
                        <i className="text-xs uppercase">
                          POR CADA AÑO
                        </i>
                        <div className="w-full mt-4 bg-transparent">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={buildPoblacionChart()} margin={{ top: 20, right: 25, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis
                                dataKey="anio" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                dy={8}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                dx={-10}
                                allowDecimals={false}
                              />
                              <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || payload.length === 0) return null;
                                  return (
                                    <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                      <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                        {label}
                                      </p>
                                      {payload.map((entry, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                          <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
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
                                align="center"
                                height={40}
                                content={() => (
                                  <div style={{ display: "flex", gap: 16, justifyContent: "flex-start" }}>
                                    {[
                                      { label: "PLANTA", color: "#002E6D" },
                                      { label: "DOE",    color: "#009BDE" },
                                    ].map((it) => (
                                      <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 12, height: 4, borderRadius: 2, background: it.color }} />
                                        <span style={{ color: "#374151", textTransform: "uppercase", fontSize: 10 }}>{it.label}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                // iconType="rect"
                                formatter={(value) => (
                                  <span style={{ color: "#374151", textTransform: "uppercase" }}>
                                    {value}
                                  </span>
                                )}
                                wrapperStyle={{
                                  position: "absolute",
                                  top: -68,
                                  left: "92%",
                                  transform: "translateX(-50%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  background: "#ffffff",
                                  borderRadius: "10px",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  width: "150px",
                                  padding: "0px 6px"
                                }}
                              />
                              <Line type="monotone" dataKey="PLANTA" stroke="#002E6D" strokeWidth={2.5} dot={{ r: 3 }} label={{ position: "top", fontSize: 10, fill: "#64748b" }} />
                              <Line type="monotone" dataKey="DOE"    stroke="#009BDE" strokeWidth={2.5} dot={{ r: 3 }} label={{ position: "top", fontSize: 10, fill: "#64748b" }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {([["planta", "PLANTA"], ["DOE", "DOE"]] as [string, string][]).map(([titulo, contrato]) => (
                        <React.Fragment key={contrato}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6 pb-0`}
                          >
                            <div className="flex items-center justify-between">
                              <h2 className="text-sm font-bold text-gray-800 flex items-center">
                                <i className="fa-solid fa-chart-line text-sea-blue mr-4"></i>
                                Tendencia estatus de salud TNG Sano {titulo}
                              </h2>
                            </div>
                            <i className="text-xs uppercase">
                              POR CADA AÑO
                            </i>
                            <div className="w-full mt-4 bg-transparent">
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={buildTendenciaChart(contrato)} margin={{ top: 10, right: 25, left: 0, bottom: 50 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                  <XAxis
                                    dataKey="anio"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    dy={8}
                                  />
                                  <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    dx={-10}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                    content={({ active, payload, label }) => {
                                      if (!active || !payload || payload.length === 0) return null;
                                      return (
                                        <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                          <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                            {label}
                                          </p>
                                          {payload.map((entry, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                              <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
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
                                    align="center"
                                    height={40}
                                    content={() => (
                                      <div style={{ display: "flex", gap: 16, justifyContent: "flex-start" }}>
                                        {[
                                          { label: "SANOS",       color: "var(--color-aqua-green)" },
                                          { label: "R. MODERADO", color: "var(--color-sunray-yellow)" },
                                          { label: "R. ALTO",     color: "var(--color-red-600)" },
                                        ].map((it) => (
                                          <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ width: 12, height: 4, borderRadius: 2, background: it.color }} />
                                            <span style={{ color: "#374151", textTransform: "uppercase", fontSize: 10 }}>{it.label}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    formatter={(value) => (
                                      <span style={{ color: "#374151", textTransform: "uppercase" }}>
                                        {value}
                                      </span>
                                    )}
                                    wrapperStyle={{
                                      position: "absolute",
                                      bottom: 30,
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      background: "#ffffff",
                                      borderRadius: "10px",
                                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                      width: "280px",
                                    }}
                                  />
                                  <Line type="monotone" dataKey="SANOS"       stroke="var(--color-aqua-green)" strokeWidth={2.5} dot={{ r: 3 }} />
                                  <Line type="monotone" dataKey="R. MODERADO" stroke="var(--color-sunray-yellow)" strokeWidth={2.5} dot={{ r: 3 }} />
                                  <Line type="monotone" dataKey="R. ALTO"     stroke="var(--color-red-600)" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6 pb-0`}
                          >
                            <div className="flex items-center justify-between">
                              <h2 className="text-sm font-bold text-gray-800 flex items-center">
                                <i className="fa-solid fa-calendar-xmark text-sea-blue mr-2"></i>
                                Ausencias {titulo} TNG Sano
                              </h2>
                            </div>
                            <i className="text-xs uppercase">
                              POR CADA AÑO
                            </i>
                            <div className="w-full mt-4 bg-transparent">
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={buildAusenciasChart(contrato)} margin={{ top: 10, right: 25, left: 0, bottom: 50 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                  <XAxis
                                    dataKey="anio"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    dy={8}
                                  />
                                  <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    dx={-10}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                    content={({ active, payload, label }) => {
                                      if (!active || !payload || payload.length === 0) return null;
                                      return (
                                        <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                          <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                            {label}
                                          </p>
                                          {payload.map((entry, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                              <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
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
                                    align="center"
                                    height={40}
                                    content={() => (
                                      <div style={{ display: "flex", gap: 16, justifyContent: "flex-start" }}>
                                        {[
                                          { label: "AUSENCIAS",   color: "var(--color-gray-300)" },
                                        ].map((it) => (
                                          <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ width: 12, height: 4, borderRadius: 2, background: it.color }} />
                                            <span style={{ color: "#374151", textTransform: "uppercase", fontSize: 10 }}>{it.label}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    formatter={(value) => (
                                      <span style={{ color: "#374151", textTransform: "uppercase" }}>
                                        {value}
                                      </span>
                                    )}
                                    wrapperStyle={{
                                      position: "absolute",
                                      bottom: 30,
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      background: "#ffffff",
                                      borderRadius: "10px",
                                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                      width: "100px",
                                      padding: "0px 6px"
                                    }}
                                  />
                                  <Line type="monotone" dataKey="AUSENCIAS" stroke="var(--color-gray-300)" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </motion.div>

                        </React.Fragment>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6 pb-0`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold text-gray-800 flex items-center">
                            <i className="fa-solid fa-chart-line text-sea-blue mr-4"></i>
                            Tendencia estatus de salud TNG Sano (Planta + DOE)
                          </h2>
                        </div>
                        <i className="text-xs uppercase">
                          POR CADA AÑO
                        </i>
                        <div className="w-full mt-4 bg-transparent">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={buildTendenciaChart()} margin={{ top: 10, right: 25, left: 0, bottom: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis
                                dataKey="anio"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                dy={8}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                dx={-10}
                                allowDecimals={false}
                              />
                              <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || payload.length === 0) return null;
                                  return (
                                    <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                      <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                        {label}
                                      </p>
                                      {payload.map((entry, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                          <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
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
                                align="center"
                                height={40}
                                content={() => (
                                  <div style={{ display: "flex", gap: 16, justifyContent: "flex-start" }}>
                                    {[
                                      { label: "SANOS",       color: "var(--color-aqua-green)" },
                                      { label: "R. MODERADO", color: "var(--color-sunray-yellow)" },
                                      { label: "R. ALTO",     color: "var(--color-red-600" },
                                    ].map((it) => (
                                      <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 12, height: 4, borderRadius: 2, background: it.color }} />
                                        <span style={{ color: "#374151", textTransform: "uppercase", fontSize: 10 }}>{it.label}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                formatter={(value) => (
                                  <span style={{ color: "#374151", textTransform: "uppercase" }}>
                                    {value}
                                  </span>
                                )}
                                wrapperStyle={{
                                  position: "absolute",
                                  bottom: 30,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  background: "#ffffff",
                                  borderRadius: "10px",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  width: "280px",
                                }}
                              />
                              <Line type="monotone" dataKey="SANOS"       stroke="var(--color-aqua-green)" strokeWidth={2.5} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="R. MODERADO" stroke="var(--color-sunray-yellow)" strokeWidth={2.5} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="R. ALTO"     stroke="var(--color-red-600)" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`bg-linear-to-b from-white to-gray-50 rounded-xl h-full shadow-xs p-6 pb-0`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold text-gray-800 flex items-center">
                            <i className="fa-solid fa-chart-column text-sea-blue mr-2"></i>
                            Estatus de salud por mes
                          </h2>
                        </div>
                        <i className="text-xs uppercase">
                          DEL AÑO {selectedYear}
                        </i>
                        <div className="w-full mt-4 bg-transparent">
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={buildMensualChart()} margin={{ top: 10, right: 25, left: 0, bottom: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis
                                dataKey="mes"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                interval={0}
                                angle={-30}
                                textAnchor="end"
                                height={20}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 11 }}
                                dx={-10}
                                allowDecimals={false}
                              />
                              <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || payload.length === 0) return null;
                                  return (
                                    <div className="bg-white" style={{ borderRadius: 5, padding: '10px 15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                      <p className="text-xs" style={{ color: '#002E6D', fontWeight: 600, marginBottom: 8 }}>
                                        {label} {currentYear}
                                      </p>
                                      {payload.map((entry, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                                          <div style={{ width: 12, height: 5, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
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
                                align="center"
                                height={40}
                                content={() => (
                                  <div style={{ display: "flex", gap: 16, justifyContent: "flex-start" }}>
                                    {[
                                      { label: "SANOS",       color: "var(--color-aqua-green)" },
                                      { label: "R. MODERADO", color: "var(--color-sunray-yellow)" },
                                      { label: "R. ALTO",     color: "var(--color-red-600" },
                                      { label: "AUSENCIAS",   color: "var(--color-gray-300" },
                                    ].map((it) => (
                                      <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 12, height: 4, borderRadius: 2, background: it.color }} />
                                        <span style={{ color: "#374151", textTransform: "uppercase", fontSize: 10 }}>{it.label}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                formatter={(value) => (
                                  <span style={{ color: "#374151", textTransform: "uppercase" }}>
                                    {value}
                                  </span>
                                )}
                                wrapperStyle={{
                                  position: "absolute",
                                  bottom: 30,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  background: "#ffffff",
                                  borderRadius: "10px",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  width: "360px",
                                }}
                              />
                              <Bar dataKey="SANOS"       fill="var(--color-aqua-green)" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="R. MODERADO" fill="var(--color-sunray-yellow)" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="R. ALTO"     fill="var(--color-red-600)" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="AUSENCIAS"   fill="var(--color-gray-300)" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="bg-white rounded-lg shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div className="flex-1 min-h-0 overflow-auto rounded-lg">
                        <table className="table-fixed w-full text-xs">
                          <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="text-gray-700 text-left">
                              <th className="px-2 py-3 pl-6 text-left font-semibold text-gray-600 whitespace-nowrap hidden">Contrato</th>
                              <th onClick={() => cycleSort("Matricula")} className="py-3 pl-6 text-left w-20 font-semibold text-gray-700 cursor-pointer select-none group">
                                <span className="flex items-center justify-center gap-1">
                                  <span>Mat.</span>
                                  <i className={`fa-solid ${sortIcon("Matricula")} text-[10px] transition-colors ${sortCol === "Matricula" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`} />
                                </span>
                              </th>
                              <th onClick={() => cycleSort("Empl_Nombres")} className="px-3 py-3 text-left font-semibold text-gray-700 w-90 cursor-pointer select-none group">
                                <span className="flex items-center justify-start gap-1">
                                  <span>Nombre</span>
                                  <i className={`fa-solid ${sortIcon("Empl_Nombres")} text-[10px] transition-colors ${sortCol === "Empl_Nombres" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`} />
                                </span>
                              </th>
                              <th className="py-3 text-center font-semibold text-gray-700 hidden">Fecha<br/>nacimiento</th>
                              <th className="py-3 text-center font-semibold text-gray-700 hidden">Edad</th>
                              {aniosTendencia.map((y) => (
                                <th key={y} className="py-3 text-center font-semibold text-gray-700 min-w-[88px]">
                                  {y}
                                </th>
                              ))}
                            </tr>
                            <tr className="bg-gray-50 text-left h-11">
                              <td colSpan={2} className="pl-6 py-2">
                                <div className="relative w-72">
                                  <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                  <input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre o matrícula"
                                    className="w-full h-7 pl-8 pr-7 py-1 rounded-md text-xs shadow-xs bg-white outline-none focus:ring-1 focus:ring-sea-blue"
                                  />
                                  {busqueda && (
                                    <button
                                      type="button"
                                      onClick={() => setBusqueda("")}
                                      title="Limpiar"
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      <i className="fa-solid fa-circle-xmark text-xs"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td colSpan={aniosTendencia.length}></td>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRegistros.map((row, idx) => (
                              <motion.tr
                                initial={{ opacity: 0, y: -1 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                key={idx}
                                className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                              >
                                <td className="px-2 pl-6 py-1.5 text-gray-700 break-words hidden">{row.Contrato}</td>
                                <td className="px-2 pl-6 text-left font-medium text-gray-700 mb-1">
                                  <p className="text-[12px] font-bold uppercase text-gray-600 block truncate">
                                    {row.Matricula}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-medium uppercase truncate">
                                    {row.Contrato == "CORPORATIVO" ? "" : row.Contrato}
                                  </p>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const nombre = String(row.Empl_Nombres ?? "");
                                      const partes = nombre.trim().split(/\s+/);
                                      const iniciales = partes.length >= 2 ? (partes[0][0] + partes[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
                                      return (
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-sea-blue to-sky-blue flex items-center justify-center text-white text-[10px] font-bold select-none">
                                          {iniciales}
                                        </div>
                                      );
                                    })()}
                                    <div className="overflow-hidden min-w-0">
                                      <p className="text-[12px] font-bold uppercase text-gray-600 block truncate">{row.Empl_Nombres}</p>
                                      <p className="text-[11px] text-gray-400 font-medium uppercase truncate">{row.Departamento}</p>
                                    </div>
                                  </div>
                                </td>
                                {/* <td className="px-2 py-1.5 text-center font-medium text-gray-700">
                                  {row.FechaNacimiento ? (() => { const [y,m,d] = String(row.FechaNacimiento).split("T")[0].split("-"); return `${d}-${m}-${y}`; })() : ""}
                                </td>
                                <td className="px-3 py-1.5 text-center font-medium text-gray-700">{row.Edad}</td> */}
                                {aniosTendencia.map((y) => {
                                  const info = riesgoAnioInfo(getRiesgoAnio(row, y));
                                  return (
                                    <td key={y} className="px-1 py-1.5 text-center">
                                      <span className={`inline-block w-full px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap ${info.cls}`}>
                                        {info.label}
                                      </span>
                                    </td>
                                  );
                                })}
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
          
          <div className="hidden">
            <div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl flex-1`}
              >
                <div className="mb-4 relative flex items-center p-6">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="mdi mdi-book-open mr-4"></i>
                    Carnet de Salud
                  </h2>
                </div>

                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Matrícula</label>
                      <div className="relative">
                        {/* <Search className={`h-3.5 w-3.5 absolute left-3 top-2.5 transition-colors ${patientNotFound ? "text-red-400" : patientForm.nombre ? "text-sea-blue" : "text-gray-400"}`} /> */}
                        {/* <input
                          type="text"
                          value={matricula}
                          onChange={(e) => setMatricula(e.target.value)}
                          placeholder="Buscar por matrícula"
                          disabled={loadingPatient}
                          className={`w-full rounded-lg pl-9 py-2 pr-10 text-xs outline-none shadow-md transition-colors ${
                            loadingPatient
                              ? "border border-gray-100 bg-gray-100"
                              : patientNotFound
                              ? "border border-red-200 bg-red-50 text-red-500 focus:ring-0"
                              : "border border-gray-100 bg-white focus:ring-1 focus:ring-sea-blue"
                          }`}
                        /> */}
                        {/* {loadingPatient && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <i className="mdi mdi-loading mdi-spin text-gray-400 text-lg"></i>
                          </div>
                        )} */}
                      </div>
                      {/* {patientNotFound && <p className="text-[10px] text-red-400 mt-1">Matrícula no encontrada</p>} */}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo</label>
                      <input
                        type="text"
                        // value={patientForm.nombre}
                        readOnly
                        placeholder="Nombre completo"
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none shadow-xs border border-gray-50 bg-gray-50 text-gray-600 placeholder:text-gray-300 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                      <input
                        type="date"
                        // value={patientForm.fechaNacimiento}
                        readOnly
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none shadow-xs border border-gray-50 bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Edad</label>
                      <input
                        type="text"
                        // value={patientForm.edad}
                        readOnly
                        placeholder="Edad"
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none shadow-xs border border-gray-50 bg-gray-50 text-gray-600 placeholder:text-gray-300 cursor-not-allowed"
                      />
                    </div>

                    {/* <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Talla</label>
                      <input
                        type="number"
                        step="0.01"
                        value={patientForm.talla}
                        onChange={(e) => setPatientForm(f => ({ ...f, talla: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div> */}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sexo</label>
                      <input
                        type="text"
                        // value={patientForm.sexo === "F" ? "Mujer" : patientForm.sexo === "M" ? "Hombre" : ""}
                        readOnly
                        placeholder="Sexo"
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none shadow-xs border border-gray-50 bg-gray-50 text-gray-600 placeholder:text-gray-300 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="bg-linear-to-r from-white to-gray-100 px-6 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                      <i className="mdi mdi-table mr-3"></i>
                      Registros
                    </h2>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {/* {historicalRegistros.length} histórico{historicalRegistros.length !== 1 ? "s" : ""} · {Math.max(0, 12 - historicalRegistros.length)} disponible{Math.max(0, 12 - historicalRegistros.length) !== 1 ? "s" : ""} */}
                    </span>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto max-h-86 pb-2">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-linear-to-r from-white to-gray-100 border-b border-gray-100">
                          <th className="pl-6 px-2 py-2.5 text-left font-medium text-gray-600">
                            Fecha<br></br>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            T.A.<br></br>
                            <span className="text-gray-400 font-normal">mmHg</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            Glucosa<br></br>
                            <span className="text-gray-400 font-normal">mg/dL</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            Colesterol<br></br>
                            <span className="text-gray-400 font-normal">mg/dL</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            Triglicéridos<br></br>
                            <span className="text-gray-400 font-normal">mg/dL</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            Peso<br></br>
                            <span className="text-gray-400 font-normal">kg</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            Talla<br></br>
                            <span className="text-gray-400 font-normal">m</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            P.A.<br></br>
                            <span className="text-gray-400 font-normal">cm</span>
                          </th>
                          <th className="px-2 py-2.5 text-left font-medium text-gray-600">
                            IMC
                          </th>
                          <th className="px-2 pr-6 py-2.5 text-left font-medium text-gray-600">
                            ICT
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* {historicalRegistros.map((row, idx) => {
                          const hImc = imcInfo(calcImc(row.peso, row.altura));
                          const hIct = ictInfo(calcIct(row.pa, row.altura));
                          return (
                            <tr key={`h-${idx}`} className="bg-gray-50/60">
                              {(["fecha","ta","glucosa","colesterol","trigliceridos","peso","altura","pa"] as const).map((field, fi) => (
                                <td key={field} className={`py-1.5 ${fi === 0 ? "pl-6 px-2" : "px-1"}`}>
                                  <input
                                    type={field === "fecha" ? "date" : "text"}
                                    value={row[field]}
                                    disabled
                                    className={`${field === "fecha" ? "w-28" : "w-full"} px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed`}
                                  />
                                </td>
                              ))}
                              <td className="px-1 py-1.5">
                                <div className={`w-14 px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs shadow-md outline-none transition-colors cursor-not-allowed ${hImc.cls} opacity-60`}>
                                  {hImc.label}
                                </div>
                              </td>
                              <td className="px-1 pr-6 py-1.5">
                                <div className={`w-14 px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs shadow-md outline-none transition-colors cursor-not-allowed ${hIct.cls} opacity-60`}>
                                  {hIct.label}
                                </div>
                              </td>
                            </tr>
                          );
                        })} */}

                        {/* {historicalRegistros.length < 12 && (() => {
                          const nImc = imcInfo(calcImc(newRegistro.peso, newRegistro.altura));
                          const nIct = ictInfo(calcIct(newRegistro.pa, newRegistro.altura));
                          return (
                            <tr className="bg-white hover:bg-blue-50/20 transition-colors">
                              <td className="pl-6 px-1 py-1.5">
                                <input type="date" value={newRegistro.fecha} max={todayStr()}
                                  onChange={(e) => updateNewRegistro("fecha", e.target.value)}
                                  className="w-28 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <div className="flex items-center bg-white border border-gray-100 shadow-md rounded-lg focus-within:ring-1 focus-within:ring-sea-blue/30">
                                  <div className="flex items-center px-2 py-1.5">
                                    <input
                                      ref={taSistRef}
                                      type="number"
                                      value={taSist}
                                      placeholder="120"
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v.length > 3) return;
                                        setTaSist(v);
                                        if (v.length === 3) taDiasRef.current?.focus();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "/" || e.key === "-") {
                                          e.preventDefault();
                                          taDiasRef.current?.focus();
                                        }
                                      }}
                                      className="w-6 text-xs outline-none bg-transparent text-center text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300"
                                    />
                                    <span className="text-gray-400 text-xs px-0.5">/</span>
                                    <input
                                      ref={taDiasRef}
                                      type="number"
                                      value={taDias}
                                      placeholder="80"
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v.length > 3) return;
                                        setTaDias(v);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Backspace" && taDias === "") {
                                          e.preventDefault();
                                          taSistRef.current?.focus();
                                          if (taSist.length > 0) setTaSist(taSist.slice(0, -1));
                                        }
                                      }}
                                      className="w-6 text-xs outline-none bg-transparent text-center text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="90" value={newRegistro.glucosa}
                                  onChange={(e) => updateNewRegistro("glucosa", e.target.value)}
                                  className="w-16 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="180" value={newRegistro.colesterol}
                                  onChange={(e) => updateNewRegistro("colesterol", e.target.value)}
                                  className="w-18 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="120" value={newRegistro.trigliceridos}
                                  onChange={(e) => updateNewRegistro("trigliceridos", e.target.value)}
                                  className="w-20 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="70.0" value={newRegistro.peso}
                                  onChange={(e) => updateNewRegistro("peso", e.target.value)}
                                  className="w-14 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="1.75" value={newRegistro.altura}
                                  onChange={(e) => updateNewRegistro("altura", e.target.value)}
                                  className="w-14 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" placeholder="90.0" value={newRegistro.pa}
                                  onChange={(e) => updateNewRegistro("pa", e.target.value)}
                                  className="w-14 px-2 py-1.5 border border-gray-100 shadow-md rounded-lg text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sea-blue transition-colors bg-white placeholder:text-gray-300"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input
                                  value={nImc.label}
                                  disabled 
                                  className={`w-14 px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs shadow-md outline-none transition-colors cursor-not-allowed ${nImc.cls}`} 
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-1 pr-6 py-1.5">
                                <input 
                                  value={nIct.label}
                                  disabled 
                                  className={`w-14 px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs shadow-md outline-none transition-colors cursor-not-allowed ${nIct.cls}`}
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          );
                        })()} */}

                        {/* {Array.from({ length: Math.max(0, 12 - historicalRegistros.length - 1) }).map((_, idx) => (
                          <tr key={`filler-${idx}`} className="bg-gray-50/30">
                            <td className="pl-6 px-1 py-1.5">
                              <input 
                                type="text"
                                placeholder="dd/MM/aaaa"
                                disabled 
                                className="w-28 px-2 py-1.5 border border-gray-100 rounded-lg text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <div className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed">
                                <span className="w-6 text-center text-xs text-gray-300">---</span>
                                <span className="text-gray-200 text-xs px-0.5">/</span>
                                <span className="w-6 text-center text-xs text-gray-300">---</span>
                              </div>
                            </td>
                            {(["glucosa","colesterol","trigliceridos","peso","altura","pa"] as const).map((f) => (
                              <td key={f} className="px-1 py-1.5">
                                <input
                                  type="text"
                                  placeholder="---"
                                  disabled
                                  className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                                />
                              </td>
                            ))}
                            <td className="px-1 py-1.5">
                              <input
                                type="text"
                                placeholder="---"
                                disabled
                                className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                              />
                            </td>
                            <td className="px-1 pr-6 py-1.5">
                              <input
                                type="text"
                                placeholder="---"
                                disabled
                                className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        ))} */}
                      </tbody>
                    </table>
                  </div>
                </div>


              </motion.div>

            </div>
            <div className="col-span-1 space-y-6 flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl flex-1"
              >
                <div className="bg-linear-to-r from-white to-gray-100 px-6 pt-6 py-3 flex items-center justify-between rounded-t-xl">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="mdi mdi-bike mr-3"></i>
                    Actividad Deportiva
                  </h2>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {/* {historicalActividades.length} histórico{historicalActividades.length !== 1 ? "s" : ""} · {actividades.filter(r => r.actividad).length} / {Math.max(0, 12 - historicalActividades.length)} nuevos */}
                  </span>
                </div>

                <div className="overflow-x-auto pb-[22px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-linear-to-r from-white to-gray-100 border-b border-gray-100">
                        <th className="px-2 pl-6 text-left font-medium text-gray-600">Fecha</th>
                        <th className="px-2 py-2.5 text-left font-medium text-gray-600">Actividad</th>
                        <th className="px-2 pr-6 py-2.5 text-left font-medium text-gray-600">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* {historicalActividades.map((row, idx) => (
                        <tr key={`ha-${idx}`} className="bg-gray-50/60">
                          <td className="pl-6 px-2 py-1.5">
                            <input type="date" value={row.fecha} disabled
                              className="w-28 px-2 py-1.5 border border-gray-100 rounded-lg text-center text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={row.actividad} disabled
                              className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                            />
                          </td>
                          <td className="px-2 pr-6 py-1.5">
                            <input type="text" value={row.estatus} disabled
                              className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs text-gray-400 bg-gray-50 outline-none shadow-md cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      ))} */}
                      {/* {actividades.slice(0, Math.max(0, 12 - historicalActividades.length)).map((row, idx) => {
                        const filled = !!row.actividad;
                        const prev = actividades[idx - 1];
                        const isDisabled =
                          idx > 0 &&
                          !(prev.fecha !== "" && prev.actividad !== "" && prev.estatus !== "");
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isDisabled
                                ? "bg-gray-50/30"
                                : filled
                                ? "bg-white hover:bg-blue-50/20"
                                : idx % 2 !== 0
                                ? "bg-gray-50/40 hover:bg-blue-50/10"
                                : "hover:bg-blue-50/10"
                            }`}
                          >
                            <td className="pl-6 px-2 py-1.5">
                              <input
                                type={isDisabled ? "text" : "date"}
                                placeholder="dd/MM/aaaa"
                                value={isDisabled ? "" : row.fecha}
                                disabled={isDisabled}
                                onChange={(e) => updateActividad(idx, "fecha", e.target.value)}
                                className={`w-28 px-2 py-1.5 border rounded-lg text-xs outline-none transition-colors ${
                                  isDisabled
                                    ? "border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed shadow-md placeholder:text-gray-300"
                                    : "border-gray-100 shadow-md bg-white text-gray-700 focus:ring-1 focus:ring-sea-blue placeholder:text-gray-300"
                                }`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                placeholder="Actividad"
                                value={row.actividad}
                                disabled={isDisabled}
                                onChange={(e) => updateActividad(idx, "actividad", e.target.value)}
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs outline-none transition-colors ${
                                  isDisabled
                                    ? "border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed shadow-md placeholder:text-gray-300"
                                    : "border-gray-100 shadow-md bg-white text-gray-700 focus:ring-1 focus:ring-sea-blue placeholder:text-gray-300"
                                }`}
                              />
                            </td>
                            <td className="px-2 pr-6 py-1.5">
                              <input
                                type="text"
                                placeholder="Estatus"
                                value={row.estatus}
                                disabled={isDisabled}
                                onChange={(e) => updateActividad(idx, "estatus", e.target.value)}
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs outline-none transition-colors ${
                                  isDisabled
                                    ? "border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed shadow-md placeholder:text-gray-300"
                                    : "border-gray-100 shadow-md bg-white text-gray-700 focus:ring-1 focus:ring-sea-blue placeholder:text-gray-300"
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })} */}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>



      
    
      {isProgramarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => { setIsProgramarOpen(false); setIsPanelOpen(false); }}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-bold text-sea-blue truncate">
                  Toma de Indicador
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Check-up de paciente
                </p>
              </div>
              <button
                title="Cerrar"
                onClick={() => { setIsProgramarOpen(false); setIsPanelOpen(false); }}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form
              id="indicadorForm"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-3 py-4 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                  <i className="fa-solid fa-circle-user mr-2"></i>
                  Información de Personal
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Matrícula
                  </label>
                  <div
                    className={`w-full border border-gray-50 rounded-lg shadow-xs bg-gray-50`}
                  >
                    <div className="relative flex items-center gap-2 px-2 h-8 cursor-text">
                      <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={formData.matricula}
                        disabled
                        // placeholder="Matrícula"
                        className="flex-1 outline-none text-xs bg-transparent placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mes de toma
                  </label>
                  <div
                    className={`w-full border border-gray-50 rounded-lg shadow-xs bg-white focus-within:border-clinical-blue focus-within:ring-1 focus-within:ring-clinical-blue`}
                  >
                    <div className="relative flex items-center gap-2 px-2 h-8 cursor-text">
                      {/* <input
                        type="month"
                        value={formData.mes}
                        // onChange={(e) => setFormData(f => ({ ...f, mes: e.target.value })) }
                        onChange={(e) => handleMesChange(e.target.value)}
                        className="flex-1 outline-none text-xs bg-transparent placeholder-gray-400"
                      /> */}
                      <select
                        value={formData.mes}
                        onChange={(e) => setFormData(f => ({ ...f, mes: e.target.value })) }
                        className="flex-1 outline-none text-xs bg-transparent"
                      >
                        {meses.map((mes) => (
                          <option
                            key={mes.valor}
                            value={`${selectedYear}-${mes.valor}`}
                            disabled={mesesRegistrados.has(mes.valor)}
                          >
                            {mes.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="fa-solid fa-clipboard-list mr-2"></i>
                  Registro de Indicadores
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Talla
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={formData.talla}
                        onChange={(e) => { const v = e.target.value; if(v.length > 4) return; setFormData(f => ({ ...f, talla: v, imc: calcImcStr(f.peso, v), ict: calcIctStr(f.pa, v) })); }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        // pl-9
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">m</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.peso}
                        onChange={(e) => { const v = e.target.value; if(v.length > 6) return; setFormData(f => ({ ...f, peso: v, imc: calcImcStr(v, f.talla) })); }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 pr-10 bg-white border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">kg</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      IMC
                    </label>
                    <input
                      type="text"
                      value={formData.imc}
                      readOnly
                      disabled
                      placeholder="0.00"
                      className={`w-full border shadow-xs rounded-lg px-2 py-2 text-xs outline-none transition-colors ${imcInfo(formData.imc ? parseFloat(formData.imc) : null).cls}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PA
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.pa}
                        onChange={(e) => { const v = e.target.value; if(v.length > 6) return; setFormData(f => ({ ...f, pa: v, ict: calcIctStr(v, f.talla) })); }}
                        placeholder="0.00"
                        className={`w-full border border-gray-50 shadow-xs rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none`}
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ICT
                    </label>
                    <input
                      type="text"
                      value={formData.ict}
                      readOnly
                      disabled
                      placeholder="0.00"
                      className={`w-full border shadow-xs rounded-lg px-2 py-2 text-xs outline-none transition-colors ${ictInfo(formData.ict ? parseFloat(formData.ict) : null).cls}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Riesgo
                    </label>
                    <select
                      value={formData.riesgo}
                      onChange={(e) => setFormData(f => ({ ...f, riesgo: e.target.value })) }
                      className={`w-full border border-gray-50 shadow-xs rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none`}
                    >
                      <option value="" disabled hidden>Seleccionar</option>
                      <option value="0">Falta</option>
                      <option value="1">Sano</option>
                      <option value="2">Moderado</option>
                      <option value="3">Alto</option>
                    </select>
                  </div>
                </div>
                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="fa-solid fa-flask-vial mr-2"></i>
                  Estudios de Laboratorio
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      T/A
                    </label>
                    <div className="w-full border border-gray-50 shadow-xs rounded-lg focus-within:ring-1 focus-within:ring-sea-blue">
                      <div className="flex items-center w-full px-2 py-2">
                        <input
                          ref={sistolicaRef}
                          type="number"
                          value={formData.sistolica}
                          onChange={(e) => { const r = e.target.value; if (r.length > 3) return; setFormData(f => ({ ...f, sistolica: r })); if (r.length === 3) diastolicaRef.current?.focus(); }}
                          onKeyDown={(e) => { if (e.key === "/" || e.key === "-") { e.preventDefault(); diastolicaRef.current?.focus(); } }}
                          placeholder="120"
                          className="w-7 text-xs text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300"
                        />
                        <span className="text-gray-400 font-medium text-xs px-1">/</span>
                        <input
                          ref={diastolicaRef}
                          type="number"
                          value={formData.diastolica}
                          onChange={(e) => {
                            const r = e.target.value;
                            if (r.length > 3) return;
                            setFormData(f => ({ ...f, diastolica: r }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && formData.diastolica === "") {
                              e.preventDefault();
                              sistolicaRef.current?.focus();
                              if (formData.sistolica.length > 0) {
                                setFormData(f => ({ ...f, sistolica: f.sistolica.slice(0, -1) }));
                              }
                            }
                          }}
                          placeholder="80"
                          className="w-7 text-xs text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Glucosa
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.glucosa}
                        onChange={(e) => setFormData(f => ({ ...f, glucosa: e.target.value })) }
                        placeholder="90"
                        className={`w-full border border-gray-50 shadow-xs rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none`}
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Colesterol
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.colesterol}
                        onChange={(e) => setFormData(f => ({ ...f, colesterol: e.target.value })) }
                        placeholder="180"
                        className={`w-full border border-gray-50 shadow-xs rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none`}
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Triglicéridos
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.trigliceridos}
                        onChange={(e) => setFormData(f => ({ ...f, trigliceridos: e.target.value })) }
                        placeholder="120"
                        className={`w-full border border-gray-50 shadow-xs rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none`}
                      />
                      <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
                    </div>
                  </div>
                </div>

                
              </div>
            </form>
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                form="indicadorForm"
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} mr-2`}></i>
                {saving ? (isEditingMensual ? "Actualizando..." : "Guardando...") : (isEditingMensual ? "Actualizar Registro" : "Guardar Registro")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Carnet
        open={isCarnetOpen}
        onClose={() => setIsCarnetOpen(false)}
        data={selectedRow ? {
          nombre: selectedRow.Empl_Nombres,
          matricula: selectedRow.Matricula,
          departamento: selectedRow.Departamento,
          contrato: selectedRow.Contrato,
          fechaNacimiento: selectedRow.FechaNacimiento ? (() => {
            const [y, m, dNum] = String(selectedRow.FechaNacimiento).split("T")[0].split("-");
            return y && m && dNum ? `${dNum}/${m}/${y}` : undefined;
          })() : undefined,
          talla: selectedRow.Altura,
          sexo: selectedRow.Sexo,
          edadSexo: selectedRow.Sexo ? `${calcEdadEnAnio(selectedRow.FechaNacimiento, selectedYear) ?? selectedRow.Edad} / ${selectedRow.Sexo}` : undefined,
          imc: selectedRow.IMC,
          ta: selectedRow.Sistolica && selectedRow.Diastolica ? `${selectedRow.Sistolica} / ${selectedRow.Diastolica}` : undefined,
          glucosa: selectedRow.Glucosa,
          colesterol: selectedRow.Colesterol,
          trigliceridos: selectedRow.Trigliceridos,
          riesgo: riesgoAnioInfo(getRiesgoAnio(selectedRow, selectedYear)).label,
          vigencia: String(selectedYear),
        } : undefined}
        mensual={mensualPorMes.map(({ mes, data }) => ({
          mes: mes.nombre,
          fecha: data?.Fecha ? new Date(data.Fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) : undefined,
          ta: data?.Sistolica && data?.Diastolica ? `${data.Sistolica}/${data.Diastolica}` : undefined,
          glucosa: data?.Glucosa,
          colesterol: data?.Colesterol,
          trigliceridos: data?.Trigliceridos,
          peso: data?.Peso,
          pa: data?.PA,
          imc: data?.IMC,
          ict: data?.ICT,
        }))}
      />

    </div>
  );
};

export default Indicadores;