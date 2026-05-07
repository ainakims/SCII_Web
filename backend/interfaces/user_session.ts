import { Request } from 'express';

export interface JwtUserPayload extends Request {
  user?: {
    id?: number,
    idRol: number,
    matricula: string;
    nombre: string;
    rol: string;
    usuario: string;
  }
}