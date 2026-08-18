import { useNavigate } from "react-router-dom";
import { RegistroValidado } from "./types";
import { EntradaFiltroClinico, FiltroClinico } from "./filtroClinico";

// Compartido por las secciones de Somatometría/Cardiovascular/Metabólico:
// arma el FiltroClinico (ver filtroClinico.ts) a partir de los registros que
// ya tiene la gráfica en memoria y navega a Pacientes.tsx con él. No hay
// llamada nueva al backend.
//
// Dos variantes: la mayoría de las gráficas ya tienen el RegistroValidado
// completo de cada persona en el bucket (usan esta, con un formateador de
// texto); algunas (ej. el explorador de dispersión de Metabólico, donde cada
// punto es {matricula, x, y} sin el registro completo) ya arman sus propias
// entradas {matricula, texto} y solo necesitan el navigate.
export function useIrAPacientesConEntradas() {
  const navigate = useNavigate();
  return (bucketLabel: string, indicador: string, columnaLabel: string, entradas: EntradaFiltroClinico[]) => {
    if (!entradas.length) return;
    const filtroClinico: FiltroClinico = { indicador, bucketLabel, columnaLabel, entradas };
    navigate("/Pacientes", { state: { filtroClinico } });
  };
}

export function useIrAPacientesFiltrados() {
  const irConEntradas = useIrAPacientesConEntradas();
  return (
    bucketLabel: string,
    indicador: string,
    columnaLabel: string,
    registros: RegistroValidado[],
    texto: (r: RegistroValidado) => string,
    valor: (r: RegistroValidado) => number | null
  ) => {
    // La fecha sale sola de r.Fecha (RegistroValidado ya la trae) — no hace
    // falta que cada gráfica la pase a mano como sí pasan texto/valor.
    irConEntradas(bucketLabel, indicador, columnaLabel, registros.map((r) => ({ matricula: r.Matricula, texto: texto(r), valor: valor(r), fecha: r.Fecha.original })));
  };
}
