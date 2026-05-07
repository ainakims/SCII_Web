
import 'dotenv/config'
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { ResponseWebService } from "../interfaces/response_web_service";
import { Parametros, ParamsWebService } from "../interfaces/params_web_service";

export async function executeQuery<T>(params: ParamsWebService): Promise<ResponseWebService<T>> {
  try {
    // const URL_SOAPSERVICE = "http://10.133.18.28:8062/Conexion.asmx";
    const URL_SOAPSERVICE = process.env.URL_SOAPSERVICE;
    const USER_ADMIN_SOAPSERVICE = process.env.USER_ADMIN_SOAPSERVICE
    const PASSWORD_ADMIN_SOAPSERVICE = process.env.PASSWORD_ADMIN_SOAPSERVICE

    function extractDataTable(parsed: any) {
      const data =
        parsed?.["soap:Envelope"]?.["soap:Body"]?.GetResponse?.GetResult?.[
          "diffgr:diffgram"
        ]?.DocumentElement?.Consulta;

      if (!data) return [];
      return Array.isArray(data) ? data : [data];
    }

    function cleanRows(rows: any[]) {
      return rows.map(row => {
        const { $, ...clean } = row;
        return clean;
      });
    }

    function buildParametersXml(params: Parametros[]): string {
      if(!params || params.length === 0){
        return `<param />`
      }
      return `
        <param>
          ${params
            .map(p => 
              `<Parametro>
                <Nombre>${p.Nombre}</Nombre>
                <Valor>${escapeXML(p.Valor)}</Valor>
              </Parametro>`
            ).join("")
          }
        </param>
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
      const mensaje =
        parsed?.["soap:Envelope"]?.["soap:Body"]?.GetResponse?.GetResult?.[
          "diffgr:diffgram"
        ]?.DocumentElement?.Consulta?.Mensaje;

      return mensaje || null;
    }

    const paramsXML = buildParametersXml(params.Parametros);
    const xml = `
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
          <Get xmlns="http://tempuri.org/">
            <consulta>${params.Consulta}</consulta>
            ${paramsXML}
            <ambiente>Produccion</ambiente>
            <tipo>${params.TipoConsulta}</tipo>
            <UnidadNegocio>${params.UnidadNegocio ?? "TNG"}</UnidadNegocio>
          </Get>
        </soap:Body>
    </soap:Envelope>`;

    const response = await axios.post(URL_SOAPSERVICE!, xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/Get"
      }
    });

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false
    });

    const rawRows = extractDataTable(parsed);
    const cleanData = cleanRows(rawRows);
    const typedData = cleanData as T[];
    const errorMsg = getErrorMessage(parsed);

    if (errorMsg) {
      return {
        isSuccess: false,
        hasResults: false,
        data: [],
        errorMessage: errorMsg
      };
    }
    return {
      isSuccess: true,
      hasResults: typedData.length > 0,
      data: typedData,
      totalCount: typedData.length
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