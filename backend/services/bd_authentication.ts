import 'dotenv/config'
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { ResponseWebService } from "../interfaces/response_web_service";
import { ParamsWebServiceAD } from "../interfaces/params_web_service";

export async function validationMicrosoftAccountAD<T>(params: ParamsWebServiceAD): Promise<ResponseWebService<T>> {
  try {
    const URL_SOAPSERVICE = process.env.URL_SOAPSERVICE;
    const USER_ADMIN_SOAPSERVICE = process.env.USER_ADMIN_SOAPSERVICE
    const PASSWORD_ADMIN_SOAPSERVICE = process.env.PASSWORD_ADMIN_SOAPSERVICE
    
    function extractValidaUsuarioAD(parsed: any): string | null {
      return parsed?.["soap:Envelope"]?.["soap:Body"]?.["ValidaUsuarioADResponse"]?.["ValidaUsuarioADResult"] ?? null;
    }

    function buildSoapXml(
      metodo: string,
      params: Record<string, string>
    ) : string {
      const parametrosXml = Object.entries(params)
        .map(([key, value]) => `<${key}>${escapeXML(value)}</${key}>`)
        .join("");

        return `
          <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:xsd="http://www.w3.org/2001/XMLSchema"
            xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
          >
          <soap:Header>
          <ValidaUsuario xmlns="http://tempuri.org/">
            <Usuario>${USER_ADMIN_SOAPSERVICE}</Usuario>
            <Contrasena>${PASSWORD_ADMIN_SOAPSERVICE}</Contrasena>
          </ValidaUsuario>
          </soap:Header>
            <soap:Body>
              <${metodo} xmlns="http://tempuri.org/">
                ${parametrosXml}
              </${metodo}>
            </soap:Body>
          </soap:Envelope>
        `;
    }

    function escapeXML(value: any): string {
      return String(value)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&apos;")
    }
    
    function getErrorMessage(parsed: any): string | null {
      const result = extractValidaUsuarioAD(parsed);

      if (!result) return "Respuesta vacía";

      if (result === "Invalido") {
        return "Usuario o contraseña incorrectos";
      }

      return null;
    }

    const xml = buildSoapXml("ValidaUsuarioAD", {
      Usuario: params.cuenta!,
      Contrasena: params.password!
    });
    
    const response = await axios.post(URL_SOAPSERVICE!, xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/ValidaUsuarioAD"
      }
    });    
    
    const parsed = await parseStringPromise(response.data, {
      explicitArray: false
    });

    const result = extractValidaUsuarioAD(parsed);

    if (!result) {
        return {
        isSuccess: false,
        hasResults: false,
        data: [],
        errorMessage: "empty response"
      };
    }

    if (result === "Invalido") {
      return {
        isSuccess: false,
        hasResults: false,
        data: [],
        errorMessage: "Credenciales inválidas"
      };
    }

    return {
      isSuccess: true,
      hasResults: true,
      data: [result as T],
      totalCount: 1
    };

  } catch (error: any) {
    return {
      isSuccess: false,
      hasResults: false,
      data: [],
      errorMessage: error?.response?.data || error.message
    };
  } 
}