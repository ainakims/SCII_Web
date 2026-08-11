import React from "react";

interface ShimmerOverlayProps {
  // Expediente tiene muchas gráficas pequeñas una junto a otra: el barrido al
  // 60% de opacidad se sentía demasiado llamativo ahí. `subtle` baja
  // opacidad/ancho para ese caso sin perder el efecto en Análisis Individual
  // (una gráfica grande por card), donde sí se quiere bien visible.
  subtle?: boolean;
}

// Barrido continuo (loop infinito) de un brillo diagonal sobre el área de una
// gráfica, tipo "shine" de skeleton de carga, para que las gráficas siempre
// se sientan "con vida" y no solo animen una vez al cargar los datos.
// Puramente decorativo: pointer-events-none para no interferir con el
// tooltip/hover de la gráfica debajo; el padre debe ser `relative
// overflow-hidden` para recortarlo a los límites del bloque. Compartido entre
// Expediente (saludPoblacional) y Análisis Individual.
const ShimmerOverlay: React.FC<ShimmerOverlayProps> = ({ subtle = false }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className={`absolute inset-y-0 left-0 -skew-x-12 bg-gradient-to-r from-transparent to-transparent animate-shimmer-sweep ${
        subtle ? "w-1/4 via-white/25" : "w-1/3 via-white/60"
      }`}
    />
  </div>
);

export default ShimmerOverlay;
