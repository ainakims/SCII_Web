import React from "react";
import glyphmap from "../assets/mci-mobile-glyphmap.json";

// Nombres de icono válidos = las llaves del glyphmap vendorizado desde
// @expo/vector-icons@15.0.3 (build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json).
// Este set es más nuevo que el de @mdi/font (detenido en 7.4.47 en npm), por lo que puede
// incluir iconos que no existen (o se ven distintos) en las clases "mdi mdi-*".
export type MciIconName = keyof typeof glyphmap;

interface MciIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: MciIconName;
  size?: number;
  color?: string;
}

// Renderiza un icono de MaterialCommunityIcons idéntico al que se ve en la app mobile
// (misma fuente, mismo glifo), en vez de depender del set más viejo de @mdi/font.
const MciIcon: React.FC<MciIconProps> = ({ name, size = 16, color, style, ...rest }) => {
  const codepoint = glyphmap[name];

  return (
    <span
      {...rest}
      style={{
        fontFamily: "MaterialCommunityIconsMobile",
        fontSize: size,
        color,
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    >
      {codepoint ? String.fromCodePoint(codepoint) : ""}
    </span>
  );
};

export default MciIcon;
