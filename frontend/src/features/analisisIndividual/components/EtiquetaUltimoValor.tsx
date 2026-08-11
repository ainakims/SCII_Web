import React from "react";

interface EtiquetaUltimoValorProps {
  cx: number;
  cy: number;
  texto: string;
  color: string;
}

// Etiqueta de texto (sin fondo ni borde) dibujada directamente sobre el
// último punto de una serie para señalar que ese es el valor vigente, en vez
// de ocupar espacio como badge en el header de la card. Ancla su extremo
// derecho un poco a la izquierda del punto para no salirse del área de la
// gráfica cuando ese punto está cerca del borde derecho.
const EtiquetaUltimoValor: React.FC<EtiquetaUltimoValorProps> = ({ cx, cy, texto, color }) => (
  <text x={cx - 6} y={cy - 12} textAnchor="end" fontSize={10} fontWeight={700} fill={color}>
    {texto}
  </text>
);

export default EtiquetaUltimoValor;
