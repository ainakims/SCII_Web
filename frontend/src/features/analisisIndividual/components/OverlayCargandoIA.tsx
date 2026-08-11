import React, { useEffect } from "react";
import { createPortal } from "react-dom";

// Overlay de carga con temática de IA: un robot (fa-solid fa-gear) con dos
// anillos girando en sentido contrario alrededor, sobre un fondo
// semitransparente con blur — para que se note claramente que hay una IA
// "trabajando", en vez del spinner genérico anterior.
//
// Se monta con un portal directo a document.body: MainLayout.tsx envuelve
// cada página en un <motion.div> de framer-motion, que crea su propio
// "containing block" para los hijos con position:fixed — así, "fixed inset-0"
// quedaba fijo al motion.div (que no mide el viewport completo) en vez de a
// la ventana, dejando un hueco abajo. El portal evita ese ancestro por completo.
//
// También bloquea el scroll del body mientras está montado, para que no se
// pueda desplazar la página "detrás" del overlay.
const OverlayCargandoIA: React.FC = () => {
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="relative flex items-center justify-center w-28 h-28 mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-sea-blue/30 animate-spin-slow"></div>
        <div className="absolute inset-3 rounded-full border-2 border-dotted border-sky-blue/50 animate-spin-reverse"></div>
        <i className="fa-solid fa-gear text-5xl text-sea-blue animate-spin"></i>
      </div>
      <p className="text-sea-blue font-bold text-sm tracking-wide">Generando análisis con IA</p>
      <p className="text-gray-400 text-xs mt-1">Esto puede tardar unos segundos</p>
    </div>,
    document.body
  );
};

export default OverlayCargandoIA;
