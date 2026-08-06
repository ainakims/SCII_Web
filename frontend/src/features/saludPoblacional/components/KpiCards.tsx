import React, { useMemo } from "react";
import { RegistroValidado } from "../types";
import { calcularEdad, calcularEstadisticas, estadisticasIndicador } from "../analytics";
import { clasificarRiesgo } from "../clinicalRules";
import KpiCard from "./shared/KpiCard";

interface KpiCardsProps {
  estadoActual: RegistroValidado[];
}

const KpiCards: React.FC<KpiCardsProps> = ({ estadoActual }) => {
  const edadStats = useMemo(() => {
    const edades = estadoActual
      .map((r) => calcularEdad(r.FechaNacimiento.original, r.Fecha.original))
      .filter((e): e is number => e != null);
    return calcularEstadisticas(edades);
  }, [estadoActual]);

  const imc = useMemo(() => estadisticasIndicador(estadoActual, "IMC"), [estadoActual]);
  const sistolica = useMemo(() => estadisticasIndicador(estadoActual, "Sistolica"), [estadoActual]);
  const diastolica = useMemo(() => estadisticasIndicador(estadoActual, "Diastolica"), [estadoActual]);
  const glucosa = useMemo(() => estadisticasIndicador(estadoActual, "Glucosa"), [estadoActual]);

  const distribucionRiesgo = useMemo(() => {
    const conteo = { Sano: 0, Moderado: 0, Alto: 0, "Sin clasificar": 0 };
    estadoActual.forEach((r) => {
      const { label } = clasificarRiesgo(r.Riesgo);
      if (label === "Sano") conteo.Sano++;
      else if (label === "Riesgo moderado") conteo.Moderado++;
      else if (label === "Riesgo alto") conteo.Alto++;
      else conteo["Sin clasificar"]++;
    });
    return conteo;
  }, [estadoActual]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-solid fa-users" label="Personas" value={estadoActual.length.toLocaleString("es-MX")} />
      {/* <KpiCard icon="fa-solid fa-calendar-days" label="Edad promedio" value={edadStats.media != null ? `${edadStats.media} años` : "Sin dato"} sub={edadStats.n ? `n=${edadStats.n}` : undefined} /> */}
      {/* <KpiCard icon="fa-solid fa-weight-scale" label="IMC promedio" value={imc.media ?? "Sin dato"} sub={imc.n ? `mediana ${imc.mediana} · n=${imc.n}` : undefined} /> */}
      {/* <KpiCard icon="fa-solid fa-heart-pulse" label="Presión promedio" value={sistolica.media && diastolica.media ? `${sistolica.media} / ${diastolica.media}` : "Sin dato"} sub={sistolica.n ? `n=${sistolica.n}` : undefined} /> */}
      {/* <KpiCard icon="fa-solid fa-droplet" label="Glucosa promedio" value={glucosa.media ?? "Sin dato"} sub={glucosa.n ? `mediana ${glucosa.mediana} · n=${glucosa.n}` : undefined} /> */}
      <KpiCard icon="fa-solid fa-shield-halved" label="Sanos" value={distribucionRiesgo.Sano.toLocaleString("es-MX")} />
      <KpiCard icon="fa-solid fa-triangle-exclamation" label="Riesgo moderado" value={distribucionRiesgo.Moderado.toLocaleString("es-MX")} />
      <KpiCard icon="fa-solid fa-circle-exclamation" label="Riesgo alto" value={distribucionRiesgo.Alto.toLocaleString("es-MX")} />
    </div>
  );
};

export default KpiCards;
