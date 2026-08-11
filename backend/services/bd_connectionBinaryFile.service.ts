
import 'dotenv/config'
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { ResponseWebService } from "../interfaces/response_web_service";
import { Parametros, ParamsWebServiceBinaryFile } from "../interfaces/params_web_service";

export async function executeQuery_BinaryFile<T>(params: ParamsWebServiceBinaryFile): Promise<ResponseWebService<T>> {
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

    function normalizeValue(value: any): any {
      if (value !== null && typeof value === "object") {
        if ("_" in value) return value._;
        if ("$" in value) return "";
      }
      return value;
    }

    function cleanRows(rows: any[]) {
      return rows.map(row => {
        const { $, ...clean } = row;
        const normalized: any = {};
        for (const key in clean) {
          normalized[key] = normalizeValue(clean[key]);
        }
        return normalized;
      });
    }

    function buildParametersXml(params: Parametros[], binaryFile: string): string {
      if(!params || params.length === 0){
        return `<param />`
      }
      if(!binaryFile || binaryFile.length  === 0){
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

    const paramsXML = buildParametersXml(params.Parametros, params.Binario);
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
          <GetWP xmlns="http://tempuri.org/">
            <consulta>${params.Consulta}</consulta>
            ${paramsXML}
            <ambiente>Produccion</ambiente>
            <tipo>${params.TipoConsulta}</tipo>
            <UnidadNegocio>${params.UnidadNegocio ?? "TNG"}</UnidadNegocio>
            <Binario>${params.Binario}</Binario>
          </GetWP>
        </soap:Body>
    </soap:Envelope>`;

    const response = await axios.post(URL_SOAPSERVICE!, xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/GetWP"
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
    console.log("Error aqui en bd \n", JSON.stringify( error.message|| "na"));
    return {
      isSuccess: false,
      hasResults: false,
      data: [],
      errorMessage: error?.response?.data || error.message
    };
  }
}