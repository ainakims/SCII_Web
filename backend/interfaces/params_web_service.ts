export const TipoConsulta = {
  Consulta: "Consulta",
  ProcedimientoAlmacenado: "ProcedimientoAlmacenado",
} as const;

export type TipoConsulta = typeof TipoConsulta[keyof typeof TipoConsulta];

export interface Parametros {
  Nombre: string;
  Valor: string;  
}

export interface ParamsWebService {
  TipoConsulta: TipoConsulta;
  Consulta: string;
  Parametros: Parametros[];
  UnidadNegocio?: string;
}

export interface ParamsWebServiceBinaryFile {
  TipoConsulta: TipoConsulta;
  Consulta: string;
  Parametros: Parametros[];
  UnidadNegocio?: string;
  Binario: string;
}

export interface UsuarioAD {
  id: number;
  nombre: string;
  rol: string;
}

export interface ParamsWebServiceAD {
  cuenta: string,
  password: string
}