import { Parametros } from "./params_web_service";

export interface verifyMicrosoftAccount{
  account:string,
  paramsSql?:Parametros[]
}

export interface mfaVerificationAccount{
  account:string,
  authenticatorCode: string
}

export interface SIACuentasAutenticacion {
  ID: number,
  Cuenta_Autenticar:string,
  SecretKey:string,
  ManualEntryKey:string,
  BarCodeImg:string,
  Cuenta_Usuario:string,
  Estado:boolean,
  General :string
}

export interface DatosCuentaMicrosoft {
  Id: number,
  Matricula: number,
  EstadoCuenta: string,
  DisplayName: string,
  Email: string,
  Login: string,
  Title: string,
  EsCuentaGenerica: boolean
  
}