import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect } from "react";
import { BodyComponent } from "reactjs-human-body";
// import { HumanBody } from "reactjs-human-body/dist/HumanBody";
// import { HumanBody } from "reactjs-human-body";
import * as BodyLib from "reactjs-human-body";
console.log(BodyLib);
// import { PartsInput } from 'reactjs-human-body/dist/components/BodyComponent/BodyComponent';

// import HumanBody from "reactjs-human-body";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import { User } from "lucide-react";

interface User {
  id: string;
  nombre?: string;
  cuenta?: string;
  puesto?: string;
  matricula?: string;
  correo?: string;
}

interface Atributo {
  valor?: string | "";
  descripcion?: string | "";
}

interface Lentes {
  sinLentes: string;
  conLentes: string;
}
/* */
interface SignosVitales {
  Peso: string;
  Talla: string;
  IMC: string;
}

interface Cabeza {
  Forma: Atributo;
  Tamaño: Atributo;
  Pelo: Atributo;
  Cara: Atributo;
}

interface Oidos {
  ["C.A.E"]: Atributo;
  Pabellón: Atributo;
  Tímpanos: Atributo;
//   Descripción: Atributo;
}

interface Ojos {
  Reflejos: Atributo;
  Párpados: Atributo;
  Pupilas: Atributo;
  Conjuntivas: Atributo;
  "Fondo de ojo": Atributo;
}

interface AgudezaVisual {
  OD: Lentes;
  OI: Lentes;
  usaLentes: boolean;
}

interface Boca {
  Mucosas: Atributo;
  Dentadura: Atributo;
  Lengua: Atributo;
  Encías: Atributo;
  Faringe: Atributo;
  Amígdalas: Atributo;
}

interface Nariz {
  Mucosas: Atributo;
  Tabique: Atributo;
}

interface Cuello {
  Ganglios: Atributo;
  Movilidad: Atributo;
  Tiroides: Atributo;
  Acantosis: Atributo;
  Pulsos: Atributo;
}

interface AreaPrecordial {
  Forma: Atributo;
  "Ruidos Cardiacos": Atributo;
  Mamas: Atributo;
  "Campos pulmonares": Atributo;
}

interface MiembrosToracicos {
  Integridad: Atributo;
  Forma: Atributo;
  Articulaciones: Atributo;
  "Tono Muscular": Atributo;
  Reflejos: Atributo;
  Sensibilidad: Atributo;
}

interface MiembrosPelvicos {
  Integridad: Atributo;
  Forma: Atributo;
  Articulaciones: Atributo;
  "Tono Muscular": Atributo;
  Reflejos: Atributo;
  Sensibilidad: Atributo;
}

interface Abdomen {
  Forma: Atributo;
}

interface Genitales {
  Fimosis: Atributo;
  Varicoceles: Atributo;
  Criptorquidia: Atributo;
  Hernias: Atributo;
  Cicatrices: Atributo;
  Nevos: Atributo;
  Vitíligo: Atributo;
}


interface PielAnexos {
  Cicatrices: Atributo;
  Nevos: Atributo;
  Vitíligo: Atributo;
}

interface ColumnaCervicalDorsal {
  Integridad: Atributo;
  Forma: Atributo;
  "Tono muscular": Atributo;
  Sensibilidad: Atributo;
  Fuerza: Atributo;
}

interface ColumnaLumbar {
  Integridad: Atributo;
  Forma: Atributo;
  "Tono muscular": Atributo;
  Sensibilidad: Atributo;
  Fuerza: Atributo;
}

interface Perfil {
  Matricula: string;
  Nombres: string;
  CURP: string;
  NSS: string;
  FechaNacimiento: string;
  Sexo: string;
  TipoSanguineo: string;
  Alergias: string;
  Enfermedades: string;
  Tratamientos: string;
  AlergiasMedicamento: string;
  Contacto: string;
  NumContacto: string;
  SignosVitales: SignosVitales;
  Cabeza: Cabeza;
  Oidos: Oidos;
  Ojos: Ojos;
  AgudezaVisual: AgudezaVisual;
  Boca: Boca;
  Nariz: Nariz;
  Cuello: Cuello;
  AreaPrecordial: AreaPrecordial;
  MiembrosToracicos: MiembrosToracicos;
  MiembrosPelvicos: MiembrosPelvicos;
  Abdomen: Abdomen;
  Genitales: Genitales;
  PielAnexos: PielAnexos;
  ColumnaCervicalDorsal: ColumnaCervicalDorsal;
  ColumnaLumbar: ColumnaLumbar;
  FechaEvaluacion: string;
}

const getIMC = (imc: string) => {
  const v = parseFloat(imc);
  console.log(v);
  
  if (!imc || isNaN(v) || v === 0) return { container: "border-gray-300 bg-gray-200/40", text: "text-gray-600", icon: "text-gray-300 group-hover:text-gray-400/60" };
  if (v <  18.5) return { container: "border-yellow-400 bg-yellow-400/10", text: "text-yellow-600", icon: "text-yellow-600/30 group-hover:text-yellow-600/50" };
  if (v <= 24.9) return { container: "bg-linear-to-r from-horz-blue/15 to-white shadow-horz-blue", text: "text-sea-blue", icon: "text-sky-blue/20 group-hover:text-sky-blue/40" };
  if (v <= 29.9) return { container: "border-yellow-400 bg-yellow-400/10", text: "text-yellow-600", icon: "text-yellow-600/30 group-hover:text-yellow-600/50" };
  return { container: "border-red-200 bg-red-50", text: "text-red-500", icon: "text-red-200 group-hover:text-red-300" };

  // bg-linear-to-r from-horz-blue/15 to-white shadow-horz-blue
};

const Perfil: React.FC = () => {
  const { user } = useAuth() as { user: User };
  const [perfil, setPerfil] = useState<Perfil[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [bodyKey, setBodyKey] = useState(0);
  const [openSection, setOpenSection] = useState<string>("Cabeza");

  const toggleSection = (key: string) =>
    setOpenSection(prev => prev === key ? prev : key);

  const BODY_PARTS = [
    "head","leftShoulder","rightShoulder","leftArm","rightArm",
    "chest","stomach","leftLeg","rightLeg","leftHand","rightHand",
    "leftFoot","rightFoot",
  ] as const;

  const PART_NAMES_ES: Record<string, string> = {
    head: "Detalles de Cabeza",
    leftShoulder: "Región Lumbar",
    rightShoulder: "Región Lumbar",
    leftArm: "Miembros Torácicos",
    rightArm: "Miembros Torácicos",
    chest: "Área Precordial",
    stomach: "Abdomen",
    leftLeg: "Miembros Pélvicos",
    rightLeg: "Miembros Pélvicos",
    leftHand: "Miembros Torácicos",
    rightHand: "Miembros Torácicos",
    leftFoot: "Miembros Pélvicos",
    rightFoot: "Miembros Pélvicos",
  };

  const PART_POSITIONS: Record<string, { top: number; side: "left" | "right" }> = {
    head: { top: 40,  side: "right" },
    leftShoulder: { top: 115, side: "right" },
    rightShoulder: { top: 115, side: "left"  },
    leftArm: { top: 180, side: "right" },
    rightArm: { top: 180, side: "left"  },
    chest: { top: 140, side: "right" },
    stomach: { top: 210, side: "right" },
    leftLeg: { top: 340, side: "right" },
    rightLeg: { top: 340, side: "left"  },
    leftHand: { top: 270, side: "right" },
    rightHand: { top: 270, side: "left"  },
    leftFoot: { top: 455, side: "right" },
    rightFoot: { top: 455, side: "left"  },
  };

  const buildPartsInput = (active: string | null) =>
    Object.fromEntries(
      BODY_PARTS.map(k => [k, { show: true, selected: k === active }])
    ) as any;

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = e.target as Element;
    const partId = target.id || target.parentElement?.id || "";

    if (!BODY_PARTS.includes(partId as any)) return;

    const next = selected === partId ? null : partId;
    console.log("Parte seleccionada:", next, "| Anterior:", selected);

    setSelected(next);
    setBodyKey(k => k + 1);
  };
  
  useEffect(() => {
    UsuarioSesion();
  }, []);

  const UsuarioSesion = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Perfil/UsuarioSesion`, {
        method: "POST",
        body: JSON.stringify({ idUsuario: user?.id, matricula: user?.matricula, usuario: user?.cuenta })
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data.map((item: any) => ({
          ...item,
          SignosVitales: typeof item.SignosVitales === "string" ? JSON.parse(item.SignosVitales) : item.SignosVitales,
          Cabeza: typeof item.Cabeza === "string" ? JSON.parse(item.Cabeza) : item.Cabeza,
          Oidos: typeof item.Oidos === "string" ? JSON.parse(item.Oidos) : item.Oidos,
          Ojos: typeof item.Ojos === "string" ? JSON.parse(item.Ojos) : item.Ojos,
          AgudezaVisual: typeof item.AgudezaVisual === "string" ? JSON.parse(item.AgudezaVisual) : item.AgudezaVisual,
          Boca: typeof item.Boca === "string" ? JSON.parse(item.Boca) : item.Boca,
          Nariz: typeof item.Nariz === "string" ? JSON.parse(item.Nariz) : item.Nariz,
          Cuello: typeof item.Cuello === "string" ? JSON.parse(item.Cuello) : item.Cuello,
          AreaPrecordial: typeof item.AreaPrecordial === "string" ? JSON.parse(item.AreaPrecordial) : item.AreaPrecordial,
          MiembrosToracicos: typeof item.MiembrosToracicos === "string" ? JSON.parse(item.MiembrosToracicos) : item.MiembrosToracicos,
          MiembrosPelvicos: typeof item.MiembrosPelvicos === "string" ? JSON.parse(item.MiembrosPelvicos) : item.MiembrosPelvicos,
          Abdomen: typeof item.Abdomen === "string" ? JSON.parse(item.Abdomen) : item.Abdomen,
          Genitales: typeof item.Genitales === "string" ? JSON.parse(item.Genitales) : item.Genitales,
          PielAnexos: typeof item.PielAnexos === "string" ? JSON.parse(item.PielAnexos) : item.PielAnexos,
          ColumnaCervicalDorsal: typeof item.ColumnaCervicalDorsal === "string" ? JSON.parse(item.ColumnaCervicalDorsal) : item.ColumnaCervicalDorsal,
          ColumnaLumbar: typeof item.ColumnaLumbar === "string" ? JSON.parse(item.ColumnaLumbar) : item.ColumnaLumbar,
        }));

        console.dir(data);

        setPerfil(data);
        // GetEvaluacion();
      }
    } catch (error) {
      console.error("Error: ", error);
    } finally {
    //   setLoading(false);
    }
  };

  //   const GetEvaluacion = async () => {
  //     try {
  //       const res = await fetchWithAuth(`${API_BASE_URL}/Perfil/GetEvaluacion`, {
  //         method: "POST",
  //         body: JSON.stringify({ matricula: user?.matricula })
  //       });
  
  //     } catch (error) {
  
  //     }
  //   }

  const formatDate = (fecha: string): string => {
    const f = new Date(fecha);
    
    const dia = String(f.getUTCDate()).padStart(2, "0");
    const mes = String(f.getUTCMonth() + 1).padStart(2, "0");
    const anio = f.getUTCFullYear();
    
    return `${dia}/${mes}/${anio}`;
  };

  const getAge = (fecha: string): number => {
    const hoy = new Date();
    const nacimiento = new Date(fecha);
  
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
  
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
  
    return edad;
  };

  const formatPhone = (phone: string): string => {
    if (!phone) return "N/A";
  
    const cleaned = phone.replace(/\D/g, "");
  
    if (cleaned.length !== 10) return phone;
  
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div className="relative flex w-full overflow-hidden">
      <div
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
        // style={{ marginRight: isModalOpen ? 300 : 0 }}
      >
        {perfil.map((p, idx) => {
          const imcStyles = getIMC(String(p.SignosVitales?.IMC ?? ""));
        
          return (
            <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
              <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-center bg-linear-to-r bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="absolute w-16 h-16 text-white bg-linear-to-b from-sea-blue to-sky-blue rounded-full flex items-center justify-center shrink-0 shadow-[0_0_20px] shadow-sky-blue/60">
                      <b>{user?.matricula != "0" ? user?.matricula : getInitials(user?.nombre)}</b>
                    </div>
                    <div className="ml-[90px]">
                      <h1 className="text-2xl font-bold text-sea-blue">
                        {user?.nombre}
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="mr-2">
                          <i className={`mdi mdi-${p.Sexo ? p.Sexo == "M" ? "gender-male" : "gender-female" : "gender-female"} mr-2`}></i>
                          {p?.Sexo}
                        </span>
                        •
                        <span className="mx-2">
                          <i className="mdi mdi-calendar-blank mr-2"></i>
                          {getAge(p.FechaNacimiento)} años
                        </span>
                        •
                        <span className="mx-2">
                          <i className="mdi mdi-cake-variant mr-2"></i>
                          {formatDate(p?.FechaNacimiento)}
                          {/* {p?.FechaNacimiento} */}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto text-right">
                    a
                  </div>
                </div>
          
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                  <div className={"lg:col-span-2"}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 pb-0 mb-[-10px]`}
                      style={{ overflow: "visible" }}
                    >
                      <h2 className="text-sm font-bold text-gray-800 flex items-center">
                        <i className="mdi mdi-human mr-4"></i>
                        Exploración Física
                      </h2>
                      <div className="body-component" style={{ position: "relative", overflow: "visible" }}>
                        <div onClickCapture={handleBodyClick}>
                          <BodyComponent
                            key={bodyKey}
                            partsInput={buildPartsInput(selected)}
                          />
                        </div>
                        <AnimatePresence>
                          {selected && (() => {
                            const pos = PART_POSITIONS[selected] ?? { top: 200, side: "right" as const };
                            const isRight = pos.side === "right";
                          
                            return (
                              <motion.div
                                key={selected}
                                initial={{ opacity: 0, x: isRight ? -8 : 8, scale: 0.94 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.94 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                style={{
                                  position: "absolute",
                                  top: pos.top - 20,
                                  zIndex: 90000,
                                  width: 330, ...(isRight ? { left: "calc(50% + 14px)" } : { right: "calc(50% + 14px)" } ),
                                }}
                              >
                                <div style={{
                                  position: "absolute",
                                  top: 20,
                                  width: 10,
                                  height: 10,
                                  background: "white",
                                  transform: "rotate(45deg)",
                                  ...(isRight ? { left: -5, borderLeft: "1px solid rgba(59,130,246,0.25)", borderBottom: "1px solid rgba(59,130,246,0.25)" } : { right: -5, borderRight: "1px solid rgba(59,130,246,0.25)", borderTop: "1px solid rgba(59,130,246,0.25)" } ),
                                }} />
                                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                                  {/* Header */}
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[10px] font-semibold text-sea-blue uppercase tracking-wide truncate">
                                      {PART_NAMES_ES[selected]}
                                    </span>
                                    <button
                                      onClick={() => { setSelected(null); setBodyKey(k => k + 1); }}
                                      className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                                      title="Cerrar"
                                    >
                                      <i className="mdi mdi-close text-xs" />
                                    </button>
                                  </div>
                              
                                  {PART_NAMES_ES[selected] === "Detalles de Cabeza" && (() => {
                                    const secciones = [
                                      {
                                        key: "Cabeza", icon: "mdi-head", rows: [
                                          { label: "Forma",  icon: "mdi-head",     val: p.Cabeza?.Forma?.valor },
                                          { label: "Tamaño", icon: "mdi-head",     val: p.Cabeza?.Tamaño?.valor },
                                          { label: "Pelo",   icon: "mdi-head",     val: p.Cabeza?.Pelo?.valor },
                                          { label: "Cara",   icon: "mdi-face-man", val: p.Cabeza?.Cara?.valor },
                                        ]
                                      },
                                      {
                                        key: "Oídos", icon: "mdi-ear-hearing", rows: [
                                          { label: "C.A.E",    icon: "mdi-ear-hearing",  val: p.Oidos?.["C.A.E"]?.valor },
                                          { label: "Pabellón", icon: "mdi-ear-hearing",  val: p.Oidos?.Pabellón?.valor },
                                          { label: "Tímpanos", icon: "mdi-circle-double", val: p.Oidos?.Tímpanos?.valor },
                                        ]
                                      },
                                      {
                                        key: "Ojos", icon: "mdi-eye", rows: [
                                          { label: "Reflejos",    icon: "mdi-eye", val: p.Ojos?.Reflejos?.valor },
                                          { label: "Párpados",    icon: "mdi-eye", val: p.Ojos?.Párpados?.valor },
                                          { label: "Conjuntivas", icon: "mdi-eye", val: p.Ojos?.Conjuntivas?.valor },
                                          { label: "Fondo de ojo",icon: "mdi-eye", val: p.Ojos?.["Fondo de ojo"]?.valor },
                                          { label: "Lentes",      icon: "mdi-glasses", val: p.AgudezaVisual?.usaLentes ? "Sí" : "No", neutral: true },
                                        ]
                                      },
                                      {
                                        key: "Boca", icon: "mdi-tooth", rows: [
                                          { label: "Mucosas",   icon: "mdi-tooth", val: p.Boca?.Mucosas?.valor },
                                          { label: "Dentadura", icon: "mdi-tooth", val: p.Boca?.Dentadura?.valor },
                                          { label: "Lengua",    icon: "mdi-tooth", val: p.Boca?.Lengua?.valor },
                                          { label: "Encías",    icon: "mdi-tooth", val: p.Boca?.Encías?.valor },
                                          { label: "Faringe",   icon: "mdi-tooth", val: p.Boca?.Faringe?.valor },
                                          { label: "Amígdalas", icon: "mdi-tooth", val: p.Boca?.Amígdalas?.valor },
                                        ]
                                      },
                                      {
                                        key: "Nariz", icon: "mdi-emoticon-neutral-outline", rows: [
                                          { label: "Mucosas", icon: "mdi-emoticon-neutral-outline", val: p.Nariz?.Mucosas?.valor },
                                          { label: "Tabique", icon: "mdi-emoticon-neutral-outline", val: p.Nariz?.Tabique?.valor },
                                        ]
                                      },
                                    ];
                                  
                                    return (
                                      <div className="space-y-1 overflow-y-auto pr-0.5">
                                        {secciones.map(sec => (
                                          <div key={sec.key} className="border border-gray-300 rounded-lg overflow-hidden">
                                            <button
                                              onClick={() => toggleSection(sec.key)}
                                              className="w-full flex items-center justify-between border-b border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                            >
                                              <span className="px-3 py-2 text-xs text-left font-medium text-gray-700 ">
                                                <i className={`mdi ${sec.icon} mr-1`} />
                                                {sec.key}
                                              </span>
                                              <i className={`mdi text-gray-400 text-sm transition-transform mr-2 ${openSection === sec.key ? "mdi-chevron-up" : "mdi-chevron-down"}`} />
                                            </button>
                                        
                                            {/* Contenido */}
                                            <AnimatePresence initial={false}>
                                            {openSection === sec.key && (
                                              <motion.div
                                                key={sec.key}
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                style={{ overflow: "hidden" }}
                                              >
                                              <div className="grid grid-cols-2 gap-1 p-1.5">
                                                {sec.rows.map(row => (
                                                  <div
                                                    key={row.label}
                                                    className={`px-2 py-1 rounded-md flex items-center justify-between text-xs ${
                                                      (row as any).neutral
                                                        ? "bg-gray-100 text-gray-700 border border-gray-200"
                                                        : row.val === "Normal"
                                                          ? "bg-aqua-green/20 text-green-950 border border-aqua-green/30"
                                                          : "bg-red-100 text-red-950 border border-red-200"
                                                    }`}
                                                  >
                                                    <span className="truncate mr-1 font-medium">{row.label}</span>
                                                    <span className="shrink-0 text-[10px]">{row.val ?? "—"}</span>
                                                  </div>
                                                ))}
                                              </div>
                                              </motion.div>
                                            )}
                                            </AnimatePresence>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
  
                                  {PART_NAMES_ES[selected] === "Región Lumbar" && (
                                    <>
                                      b
                                    </>
                                  )}
  
                                  {PART_NAMES_ES[selected] === "Área Precordial" && (
                                    <>
                                      c
                                    </>
                                  )}
  
                                  {PART_NAMES_ES[selected] === "Miembros Torácicos" && (
                                    <>
                                      
                                      {/* {p.Cabeza?.Cara?.valor?.toUpperCase() ?? "N/A"} */}
                                  
                                    </>
                                  )}
  
                                  {PART_NAMES_ES[selected] === "Abdomen" && (
                                    <>
                                      e
                                    </>
                                  )}
  
                                  {PART_NAMES_ES[selected] === "Miembros Pélvicos" && (
                                    <>
                                      f
                                    </>
                                  )}
                                  
                                
                                  
                                
                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </div>
                          
                  <div className="lg:col-span-4 space-y-6">
                    <div className="grid grid-cols-4 gap-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative overflow-hidden bg-linear-to-r from-red-100/80 to-white rounded-xl text-red-500 shadow-sm px-4 py-2 flex flex-col justify-between group cursor-default shadow-red-300/60"
                      >
                        <i className="mdi mdi-water absolute -bottom-2 right-0 text-[3rem] text-red-200 group-hover:text-red-300 transition-colors duration-300 pointer-events-none select-none" />
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            Tipo de Sangre
                          </span>
                        </div>
                        <span className="text-xl font-bold relative z-10">
                          {p.TipoSanguineo ? p.TipoSanguineo : "N/A"}
                        </span>
                      </motion.div>
                        
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative overflow-hidden bg-linear-to-r from-horz-blue/15 to-white rounded-xl text-sea-blue shadow-sm px-4 py-2 flex flex-col justify-between group cursor-default shadow-horz-blue"
                      >
                        <i className="mdi mdi-weight absolute -bottom-2 right-3 text-[3rem] text-sky-blue/20 group-hover:text-sky-blue/40 transition-colors duration-300 pointer-events-none select-none" />
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            Peso
                          </span>
                        </div>
                        <span className="text-xl font-bold text-sea-blue relative z-10">
                          {p.SignosVitales?.Peso ? `${p.SignosVitales.Peso} kg` : "N/A"}
                        </span>
                      </motion.div>
                        
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative overflow-hidden bg-linear-to-r from-horz-blue/15 to-white rounded-xl text-sea-blue shadow-sm px-4 py-2 flex flex-col justify-between group cursor-default shadow-horz-blue"
                      >
                        <i className="mdi mdi-human-male-height-variant absolute -bottom-2 right-2 text-[3rem] text-sky-blue/20 group-hover:text-sky-blue/40 transition-colors duration-300 pointer-events-none select-none" />
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            Estatura
                          </span>
                        </div>
                        <span className="text-xl font-bold text-sea-blue relative z-10">
                          {p.SignosVitales?.Talla ? `${p.SignosVitales.Talla} m` : "N/A"}
                        </span>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative overflow-hidden rounded-xl shadow-sm px-4 py-2 flex flex-col justify-between group cursor-default ${imcStyles.container}`}
                      >
                        <i className={`mdi mdi-scale-balance absolute -bottom-2 right-2 text-[3rem] transition-colors duration-300 pointer-events-none select-none ${imcStyles.icon} transition-colors duration-300`} />
                        <div className="flex items-center justify-between relative z-10">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${imcStyles.text}`}>
                            IMC
                          </span>
                        </div>
                        <span className={`text-xl font-bold relative z-10 ${imcStyles.text}`}>
                          {p.SignosVitales?.IMC ? `${p.SignosVitales.IMC}` : "N/A"}
                        </span>
                      </motion.div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 items-start">
                      <div className="space-y-6">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white rounded-xl border border-sea-blue shadow-sm p-6"
                        >
                          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                            <i className="mdi mdi-account-voice mr-4"></i>
                            Contacto de Emergencia
                          </h2>
                          <div className="grid grid-cols-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nombre
                            </label>
                            <div className="w-full py-2 border border-none rounded-lg text-xs font-small outline-none">
                              <b>{p?.Contacto ? p.Contacto : "N/A"}</b>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 mt-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Teléfono
                            </label>
                            <div className="w-full py-2 border border-none rounded-lg text-xs font-small outline-none">
                              <b>{p.NumContacto ? formatPhone(p.NumContacto) : "+XX XXX XXX XXXX"}</b>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      <div>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col"
                        >
                          <div className="flex items-center justify-between px-6 py-7 border-b border-gray-100">
                            <h2 className="text-sm font-bold text-gray-800 flex items-center">
                              <i className="mdi mdi-information mr-4"></i>
                              Alergias
                            </h2>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
                            {p.Alergias}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

      {/* aside */}
      </div>
    </div>
  );
}

export default Perfil;