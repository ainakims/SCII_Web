"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = executeQuery;
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
async function executeQuery(params) {
    var _a, _b;
    try {
        // const URL_SOAPSERVICE = "http://10.133.18.28:8062/Conexion.asmx";
        const URL_SOAPSERVICE = process.env.URL_SOAPSERVICE;
        const USER_ADMIN_SOAPSERVICE = process.env.USER_ADMIN_SOAPSERVICE;
        const PASSWORD_ADMIN_SOAPSERVICE = process.env.PASSWORD_ADMIN_SOAPSERVICE;
        function extractDataTable(parsed) {
            var _a, _b, _c, _d, _e, _f;
            const data = (_f = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed["soap:Envelope"]) === null || _a === void 0 ? void 0 : _a["soap:Body"]) === null || _b === void 0 ? void 0 : _b.GetResponse) === null || _c === void 0 ? void 0 : _c.GetResult) === null || _d === void 0 ? void 0 : _d["diffgr:diffgram"]) === null || _e === void 0 ? void 0 : _e.DocumentElement) === null || _f === void 0 ? void 0 : _f.Consulta;
            if (!data)
                return [];
            return Array.isArray(data) ? data : [data];
        }
        function normalizeValue(value) {
            if (value !== null && typeof value === "object") {
                if ("_" in value)
                    return value._;
                if ("$" in value)
                    return "";
            }
            return value;
        }
        function cleanRows(rows) {
            return rows.map(row => {
                const { $, ...clean } = row;
                const normalized = {};
                for (const key in clean) {
                    normalized[key] = normalizeValue(clean[key]);
                }
                return normalized;
            });
        }
        function buildParametersXml(params) {
            if (!params || params.length === 0) {
                return `<param />`;
            }
            return `
        <param>
          ${params
                .map(p => `<Parametro>
                <Nombre>${p.Nombre}</Nombre>
                <Valor>${escapeXML(p.Valor)}</Valor>
              </Parametro>`).join("")}
        </param>
        `;
        }
        function escapeXML(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");
        }
        function getErrorMessage(parsed) {
            var _a, _b, _c, _d, _e, _f, _g;
            const mensaje = (_g = (_f = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed["soap:Envelope"]) === null || _a === void 0 ? void 0 : _a["soap:Body"]) === null || _b === void 0 ? void 0 : _b.GetResponse) === null || _c === void 0 ? void 0 : _c.GetResult) === null || _d === void 0 ? void 0 : _d["diffgr:diffgram"]) === null || _e === void 0 ? void 0 : _e.DocumentElement) === null || _f === void 0 ? void 0 : _f.Consulta) === null || _g === void 0 ? void 0 : _g.Mensaje;
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
            <UnidadNegocio>${(_a = params.UnidadNegocio) !== null && _a !== void 0 ? _a : "TNG"}</UnidadNegocio>
          </Get>
        </soap:Body>
    </soap:Envelope>`;
        const response = await axios_1.default.post(URL_SOAPSERVICE, xml, {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://tempuri.org/Get"
            }
        });
        const parsed = await (0, xml2js_1.parseStringPromise)(response.data, {
            explicitArray: false
        });
        const rawRows = extractDataTable(parsed);
        const cleanData = cleanRows(rawRows);
        const typedData = cleanData;
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
    }
    catch (error) {
        return {
            isSuccess: false,
            hasResults: false,
            data: [],
            errorMessage: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message
        };
    }
}
