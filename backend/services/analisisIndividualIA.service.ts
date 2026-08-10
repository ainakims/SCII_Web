// Cliente del servicio SOAP externo "EvaluacionSalud.asmx" (.NET, servicio de
// análisis individual con IA — repo aparte, ver memoria de proyecto). Construye
// el envelope, llama al WebMethod EvaluarSaludConAnalisisIA, y extrae el JSON
// que regresa como string dentro de <EvaluarSaludConAnalisisIAResult>.
//
// IMPORTANTE: `esUsuarioMedico` se decide en el controller a partir del rol del
// JWT (nunca de un valor mandado por el cliente) — este servicio solo recibe lo
// que ya se decidió, no valida nada de negocio.

import https from "https";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { AnalisisIndividualResult } from "../interfaces/analisis_individual";

// TODO: reemplazar por la URL real cuando el servicio deje de correr en
// localhost de desarrollo (ver backend/.env — URL_SOAP_ANALISIS_INDIVIDUAL).
const URL_DEFAULT = "http://10.133.18.28:1619/EvaluacionSalud.asmx";
const SOAP_ACTION = "http://tempuri.org/EvaluarSaludConAnalisisIA";

// El certificado de EvaluacionSalud.asmx en localhost es el autofirmado típico
// de IIS Express — se relaja la verificación TLS SOLO para esta llamada, no de
// forma global en el proceso.
const agenteDev = new https.Agent({ rejectUnauthorized: false });

function construirEnvelope(idUsuario: string, esUsuarioMedico: boolean): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <EvaluarSaludConAnalisisIA xmlns="http://tempuri.org/">
      <idUsuario>${idUsuario}</idUsuario>
      <esUsuarioMedico>${esUsuarioMedico}</esUsuarioMedico>
    </EvaluarSaludConAnalisisIA>
  </soap:Body>
</soap:Envelope>`;
}

// Busca recursivamente la primera clave que termine en "Result" en el árbol ya
// parseado por xml2js — evita depender de un prefijo de namespace exacto
// (soap: / s: / etc.) que puede variar según cómo esté configurado el servicio.
function encontrarResult(nodo: any): string | null {
  if (nodo == null || typeof nodo !== "object") return null;
  for (const clave of Object.keys(nodo)) {
    if (/Result$/.test(clave)) {
      const valor = nodo[clave];
      if (typeof valor === "string") return valor;
      if (valor && typeof valor === "object" && "_" in valor) return valor._;
    }
  }
  for (const clave of Object.keys(nodo)) {
    const encontrado = encontrarResult(nodo[clave]);
    if (encontrado != null) return encontrado;
  }
  return null;
}

export async function evaluarSaludConAnalisisIA(idUsuario: string, esUsuarioMedico: boolean): Promise<AnalisisIndividualResult> {
  const url = process.env.URL_SOAP_ANALISIS_INDIVIDUAL || URL_DEFAULT;
  const envelope = construirEnvelope(idUsuario, esUsuarioMedico);

  const response = await axios.post(url, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: SOAP_ACTION,
    },
    // httpsAgent: agenteDev,
    timeout: 60000,
  });

  const parsed = await parseStringPromise(response.data, { explicitArray: false, tagNameProcessors: [(name) => name.replace(/^.*:/, "")] });

  const jsonTexto = encontrarResult(parsed);
  if (!jsonTexto) {
    throw new Error("La respuesta del servicio de análisis individual no trajo el resultado esperado.");
  }

  try {
    return JSON.parse(jsonTexto) as AnalisisIndividualResult;
  } catch {
    throw new Error("El servicio de análisis individual regresó un resultado que no se pudo interpretar como JSON.");
  }
}
