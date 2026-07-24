import React, { forwardRef, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { motion, AnimatePresence } from "framer-motion";

// ─── Datos dinámicos del carnet (placeholder — se completa con info real del trabajador) ──
export interface CarnetData {
  nombre?: string;
  matricula?: string;
  puesto?: string;
  departamento?: string;
  contrato?: string;
  edadSexo?: string;
  fechaNacimiento?: string;
  talla?: string;
  sexo?: string;
  vigencia?: string;
  imc?: string;
  ta?: string;
  glucosa?: string;
  colesterol?: string;
  trigliceridos?: string;
  riesgo?: string;
}

// ─── Toma de indicadores de un mes puntual, para las tablas del carnet ──
export interface CarnetMesRegistro {
  mes: string;
  fecha?: string;
  ta?: string;
  glucosa?: string;
  colesterol?: string;
  trigliceridos?: string;
  peso?: string;
  pa?: string;
  imc?: string;
  ict?: string;
}

interface CarnetProps {
  open: boolean;
  onClose: () => void;
  data?: CarnetData;
  mensual?: CarnetMesRegistro[];
}

const MESES_CARNET = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const CarnetPagina = forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className = "", children }, ref) => (
    <div ref={ref} className={`w-full h-full overflow-hidden ${className}`}>
      {children}
    </div>
  )
);
CarnetPagina.displayName = "CarnetPagina";

const Dato: React.FC<{ icon: string; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
    <div className="w-8 h-8 rounded-md bg-linear-to-b from-sea-blue to-sky-blue flex items-center justify-center flex-shrink-0">
      <i className={`mdi ${icon} text-white text-sm`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <p className="text-xs font-bold text-gray-800 truncate">{value || "—"}</p>
    </div>
  </div>
);

const Carnet: React.FC<CarnetProps> = ({ open, onClose, data, mensual }) => {
  const bookRef = useRef<any>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = 4;

  const d = data ?? {};
  const nombre = d.nombre || "Nombre del colaborador";
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "NN";

  const filasMensuales: CarnetMesRegistro[] =
    mensual && mensual.length === 12 ? mensual : MESES_CARNET.map((mes) => ({ mes }));

  const goNext = () => bookRef.current?.pageFlip()?.flipNext();
  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="carnet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="carnet-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative flex flex-col items-center"
          >
            {/* <button
              onClick={onClose}
              title="Cerrar"
              className="absolute -top-3 -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-red-500 shadow-lg transition-colors cursor-pointer"
            >
              <i className="mdi mdi-close text-xl"></i>
            </button> */}

            <div className="flex items-center gap-3 sm:gap-5" style={{ perspective: "2400px" }}>
              <button
                onClick={goPrev}
                title="Página anterior"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-sea-blue shadow-lg hover:bg-white hover:-translate-x-0.5 transition-all cursor-pointer flex-shrink-0"
              >
                <i className="mdi mdi-chevron-left text-2xl"></i>
              </button>

              <HTMLFlipBook
                ref={bookRef}
                width={380}
                height={500}
                size="fixed"
                minWidth={280}
                maxWidth={320}
                minHeight={400}
                maxHeight={460}
                startPage={0}
                startZIndex={10}
                autoSize={false}
                showCover={true}
                usePortrait={false}
                drawShadow={true}
                maxShadowOpacity={0.5}
                flippingTime={700}
                mobileScrollSupport={false}
                clickEventForward={true}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
                onFlip={(e: any) => setPageIndex(e.data)}
                className="carnet-flipbook"
                style={{}}
              >
                <CarnetPagina className="relative bg-white text-[#316543] shadow-2xl">
                  <div className="w-full py-2.5 bg-[#316543] text-white text-center font-bold text-base tracking-wide">
                    CARNET DE SALUD
                  </div>

                  <div className="px-5 py-5 pb-12 flex flex-col gap-4 text-[11px]">
                    <div>
                      <div className="flex items-end gap-2">
                        <p className="font-semibold shrink-0">Nombre completo:</p>
                        <p className="flex-1 border-b border-[#316543] pb-1 font-bold text-xs leading-4">{nombre !== "Nombre del colaborador" ? nombre : " "}</p>
                      </div>
                      <div className="flex items-end gap-2 mt-2">
                        <p className="font-semibold shrink-0 invisible">Nombre completo:</p>
                        <p className="flex-1 border-b border-[#316543] pb-1 leading-4">&nbsp;</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-end gap-2">
                        <p className="font-semibold shrink-0">Fecha de nacimiento:</p>
                        <p className="flex-1 border-b border-[#316543] pb-1 font-bold text-xs leading-4">{d.fechaNacimiento || " "}</p>
                      </div>
                      <p className="text-right text-[8px] text-red-500 font-semibold mt-0.5">dd / mm / aaaa</p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 flex items-end gap-2">
                        <p className="font-semibold shrink-0">Matrícula:</p>
                        <p className="flex-1 border-b border-[#316543] pb-1 font-bold text-xs leading-4">{d.matricula || " "}</p>
                      </div>
                      <div className="flex-1 flex items-end gap-2">
                        <p className="font-semibold shrink-0">Talla:</p>
                        <p className="flex-1 border-b border-[#316543] pb-1 font-bold text-xs leading-4">{d.talla || " "}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 mt-1">
                      <p className="font-semibold">Sexo:</p>
                      <div className="flex items-center gap-1.5">
                        <span>Mujer</span>
                        <span className="w-4 h-4 border-2 border-[#8e484b] rounded-[2px] flex items-center justify-center">
                          {d.sexo === "F" && <i className="mdi mdi-check text-[10px] text-[#8e484b]"></i>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Hombre</span>
                        <span className="w-4 h-4 border-2 border-[#8e484b] rounded-[2px] flex items-center justify-center">
                          {d.sexo === "M" && <i className="mdi mdi-check text-[10px] text-[#8e484b]"></i>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 py-2.5 bg-[#316543] text-white text-center text-xs font-bold">
                    Llevando tu Salud... a un Puerto Seguro
                  </div>
                </CarnetPagina>

                {/* ── Página 1: datos personales ── */}
                <CarnetPagina className="bg-white py-5 pl-5 shadow-2xl flex flex-col">
                  <div className="w-full py-2 bg-[#316543] border border-[#316543] text-white text-right font-bold text-base tracking-[0.50em] flex-shrink-0">
                    REGIS
                  </div>
                  <div className="flex-1 min-h-0">
                  <table className="w-full h-full">
                    <thead>
                      <tr>
                        <th className="px-1 py-2 uppercase text-center text-[10px] text-[#8e484b] border border-[#316543]">
                          <span className="inline-block scale-y-140">
                            Fecha
                          </span>
                        </th>
                        <th className="px-1 py-2 uppercase text-center text-[10px] text-[#8e484b] border border-[#316543]">
                          <span className="inline-block scale-y-140">
                            T.A.
                          </span>
                        </th>
                        <th className="px-1 py-2 uppercase text-center text-[10px] text-[#8e484b] border border-[#316543]">
                          <span className="inline-block scale-y-140">
                            Glucosa
                          </span>
                        </th>
                        <th className="px-1 py-2 uppercase text-center text-[10px] text-[#8e484b] border border-[#316543]">
                          <span className="inline-block scale-y-140">
                            Colesterol
                          </span>
                        </th>
                        <th className="px-1 py-2 uppercase text-center text-[10px] text-[#8e484b] border border-[#316543]">
                          <span className="inline-block scale-y-140">
                            Trigliceridos
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filasMensuales.map((m, i) => (
                        <tr key={m.mes} className="bg-white">
                          <td className="px-1 py-[7px] text-left text-xs text-[#316543] border border-[#316543]">
                            {m.mes}
                          </td>
                          <td className="px-1 py-[7px] text-center text-xs text-[#316543] border border-[#316543]">
                            {m.ta || ""}
                          </td>
                          <td className="px-1 py-[7px] text-center text-xs text-[#316543] border border-[#316543]">
                            {m.glucosa || ""}
                          </td>
                          <td className="px-1 py-[7px] text-center text-xs text-[#316543] border border-[#316543]">
                            {m.colesterol || ""}
                          </td>
                          <td className="px-1 py-[7px] text-center text-xs text-[#316543] border border-[#316543]">
                            {m.trigliceridos || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </CarnetPagina>

                <CarnetPagina className="bg-white py-5 pr-5 shadow-2xl flex flex-col">
                  <div className="w-full py-2 bg-[#316543] border border-[#316543] text-white text-left font-bold text-base tracking-[0.50em] flex-shrink-0">
                    TROS
                  </div>
                  <div className="flex-1 min-h-0">
                    <table className="w-full h-full">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#8e484b] border-t border-r border-b border-[#316543]">
                            <span className="inline-block scale-y-140">
                              Peso
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#8e484b] bg-[#ebf5ee] border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              P.A.
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#8e484b] bg-[#ebf5ee] border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              IMC
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#8e484b] bg-[#ebf5ee] border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              ICT
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#8e484b] bg-[#ebf5ee] border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              Firma
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasMensuales.map((m, i) => (
                          <tr key={m.mes} className="bg-white">
                            <td className="px-1 h-[31px] py-[7px] text-center text-xs text-[#316543] border-t border-r border-b border-[#316543]">
                              {m.peso || ""}
                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-[#316543] bg-[#ebf5ee] border border-[#316543]">
                              {m.pa || ""}
                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-[#316543] bg-[#ebf5ee] border border-[#316543]">
                              {m.imc || ""}
                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-[#316543] bg-[#ebf5ee] border border-[#316543]">
                              {m.ict || ""}
                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-[#316543] bg-[#ebf5ee] border border-[#316543]">

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CarnetPagina>

                <CarnetPagina className="bg-white py-5 p-5 shadow-2xl flex flex-col">
                  <div className="flex-1 min-h-0">
                    <table className="w-full h-full">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#316543] font-extrabold border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              Fecha
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#316543] font-extrabold border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              Actividad deportiva
                            </span>
                          </th>
                          <th className="px-2 py-2 uppercase text-center text-[10px] text-[#316543] font-extrabold border border-[#316543]">
                            <span className="inline-block scale-y-140">
                              Estatus
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasMensuales.map((m) => (
                          <tr key={m.mes} className="bg-white">
                            <td className="h-[31px] px-1 py-[7px] text-center text-xs text-[#316543] border border-[#316543]">

                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-gray-500 border border-[#316543]">

                            </td>
                            <td className="px-1 py-[7px] text-center text-xs text-gray-500 border border-[#316543]">

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CarnetPagina>
              </HTMLFlipBook>

              <button
                onClick={goNext}
                title="Página siguiente"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-sea-blue shadow-lg hover:bg-white hover:translate-x-0.5 transition-all cursor-pointer flex-shrink-0"
              >
                <i className="mdi mdi-chevron-right text-2xl"></i>
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === pageIndex ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Carnet;
