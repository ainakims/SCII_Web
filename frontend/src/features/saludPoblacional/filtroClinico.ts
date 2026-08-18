// Contrato del filtro clínico que viaja de una gráfica del Dashboard hacia
// Pacientes.tsx vía navigate(..., { state }). No requiere ida y vuelta al
// backend: cada gráfica ya tiene en memoria el RegistroValidado completo de
// cada persona (viene de un solo fetch a /SaludPoblacional/ObtenerDatos), así
// que arma aquí mismo la lista de matrículas + el valor que originó el filtro
// (ej. "IMC 32.4 · Peso 85 kg") para que Pacientes.tsx solo tenga que cruzar
// por matrícula contra su propia lista, sin volver a calcular nada clínico.
export interface EntradaFiltroClinico {
  matricula: string;
  // Texto ya formateado, listo para mostrarse en la tabla de Pacientes (ej.
  // "IMC 32.4 · Peso 85 kg · Talla 1.72 m").
  texto: string;
  // Valor numérico "principal" que originó el filtro (ej. el IMC, el ICT, la
  // lectura de glucosa) — separado del texto para poder ordenar/filtrar la
  // columna clínica en Pacientes.tsx sin tener que parsear el texto.
  valor: number | null;
  // Fecha de la medición (RegistroValidado.Fecha.original) — para mostrar en
  // un tooltip al pasar el mouse sobre la columna clínica en Pacientes.tsx,
  // así se sabe de cuándo es el dato que originó el filtro.
  fecha: string | null;
}

export interface FiltroClinico {
  indicador: string; // "imc" | "ict" | ...
  bucketLabel: string; // etiqueta de la categoría/segmento en el que se dio clic
  // Encabezado de la columna clínica que se muestra en Pacientes.tsx mientras
  // este filtro esté activo (ej. "IMC", "ICT", "Presión arterial", "Glucosa").
  columnaLabel: string;
  entradas: EntradaFiltroClinico[];
}
