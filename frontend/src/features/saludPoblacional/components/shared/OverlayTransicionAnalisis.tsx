import React from "react";
import { createPortal } from "react-dom";

const OverlayTransicionAnalisis: React.FC = () => createPortal(
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/25 backdrop-blur-sm overflow-hidden">
    <div className="ai-aurora-transicion ai-aurora-transicion-1"></div>
    <div className="ai-aurora-transicion ai-aurora-transicion-2"></div>

    <div className="relative z-10 flex items-center justify-center w-32 h-32 mb-1">
      <i className="fa-solid fa-atom ai-icon-pulse-transicion animate-spin-periodic" style={{ fontSize: 84 }}></i>
    </div>
    <p className="relative z-10 text-sea-blue font-bold text-sm tracking-wide">Generando análisis con IA</p>

    <style>{`
      .ai-icon-pulse-transicion::before {
        background: linear-gradient(90deg, #002E6D, #009BDE, #002E6D);
        background-size: 250% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: aiIconShimmerTransicion 2.2s linear infinite;
      }
      @keyframes aiIconShimmerTransicion {
        0%   { background-position: 0% center; }
        100% { background-position: -250% center; }
      }
      .ai-aurora-transicion {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 150vmax;
        height: 150vmax;
        margin-top: -75vmax;
        margin-left: -75vmax;
        filter: blur(90px);
        opacity: 0.18;
        will-change: transform;
      }
      .ai-aurora-transicion-1 {
        background: conic-gradient(from 0deg,
          #9ACAEB, #009BDE, #9ACAEB, #D1D5DB, #9ACAEB
        );
        animation: auroraSpinTransicion1 16s linear infinite;
      }
      .ai-aurora-transicion-2 {
        background: conic-gradient(from 180deg,
          #009BDE, #D1D5DB, #9ACAEB, #D1D5DB, #009BDE
        );
        mix-blend-mode: soft-light;
        opacity: 0.2;
        animation: auroraSpinTransicion2 22s linear infinite reverse;
      }
      @keyframes auroraSpinTransicion1 {
        0%   { transform: rotate(0deg) scale(1); }
        50%  { transform: rotate(180deg) scale(1.08); }
        100% { transform: rotate(360deg) scale(1); }
      }
      @keyframes auroraSpinTransicion2 {
        0%   { transform: rotate(0deg) scale(1.1); }
        50%  { transform: rotate(180deg) scale(0.95); }
        100% { transform: rotate(360deg) scale(1.1); }
      }
    `}</style>
  </div>,
  document.body
);

export default OverlayTransicionAnalisis;
