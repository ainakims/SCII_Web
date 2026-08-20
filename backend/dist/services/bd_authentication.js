"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationMicrosoftAccountAD = validationMicrosoftAccountAD;
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
async function validationMicrosoftAccountAD(params) {
    var _a;
    try {
        const URL_SOAPSERVICE = process.env.URL_SOAPSERVICE;
        const USER_ADMIN_SOAPSERVICE = process.env.USER_ADMIN_SOAPSERVICE;
        const PASSWORD_ADMIN_SOAPSERVICE = process.env.PASSWORD_ADMIN_SOAPSERVICE;
        function extractValidaUsuarioAD(parsed) {
            var _a, _b, _c, _d;
            return (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed["soap:Envelope"]) === null || _a === void 0 ? void 0 : _a["soap:Body"]) === null || _b === void 0 ? void 0 : _b["ValidaUsuarioADResponse"]) === null || _c === void 0 ? void 0 : _c["ValidaUsuarioADResult"]) !== null && _d !== void 0 ? _d : null;
        }
        function buildSoapXml(metodo, params) {
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
        function escapeXML(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");
        }
        function getErrorMessage(parsed) {
            const result = extractValidaUsuarioAD(parsed);
            if (!result)
                return "Respuesta vacía";
            if (result === "Invalido") {
                return "Usuario o contraseña incorrectos";
            }
            return null;
        }
        const xml = buildSoapXml("ValidaUsuarioAD", {
            Usuario: params.cuenta,
            Contrasena: params.password
        });
        const response = await axios_1.default.post(URL_SOAPSERVICE, xml, {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://tempuri.org/ValidaUsuarioAD"
            }
        });
        const parsed = await (0, xml2js_1.parseStringPromise)(response.data, {
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
            data: [result],
            totalCount: 1
        };
    }
    catch (error) {
        return {
            isSuccess: false,
            hasResults: false,
            data: [],
            errorMessage: ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message
        };
    }
}
