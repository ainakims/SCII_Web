"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDb = createDb;
const bd_connection_service_1 = require("../../services/bd_connection.service");
const params_web_service_1 = require("../../interfaces/params_web_service");
const bd_authentication_1 = require("../../services/bd_authentication");
const bd_connectionBinaryFile_service_1 = require("../../services/bd_connectionBinaryFile.service");
function createDb() {
    return {
        async safeExecute(sql) {
            var _a;
            const result = await (0, bd_connection_service_1.executeQuery)({
                TipoConsulta: params_web_service_1.TipoConsulta.Consulta,
                Consulta: sql,
                Parametros: [],
            });
            if (!result.isSuccess) {
                throw new Error((_a = result.errorMessage) !== null && _a !== void 0 ? _a : 'Query failed');
            }
            return result.data;
        },
        async safeRun(sql) {
            var _a;
            const result = await (0, bd_connection_service_1.executeQuery)({
                TipoConsulta: params_web_service_1.TipoConsulta.Consulta,
                Consulta: sql,
                Parametros: [],
            });
            if (!result.isSuccess) {
                throw new Error((_a = result.errorMessage) !== null && _a !== void 0 ? _a : 'Execute failed');
            }
        },
        async executeConnection(sql, tipoConsulta, params) {
            var _a, _b;
            try {
                const result = await (0, bd_connection_service_1.executeQuery)({
                    TipoConsulta: tipoConsulta,
                    Consulta: sql,
                    Parametros: params,
                });
                if (!result.isSuccess) {
                    throw new Error((_a = result.errorMessage) !== null && _a !== void 0 ? _a : 'Query failed');
                }
                return result.data;
            }
            catch (error) {
                throw new Error((_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "Error al ejecutar conexión");
            }
        },
        async validationMicrosoftAccountAD(params) {
            var _a, _b;
            try {
                const result = await (0, bd_authentication_1.validationMicrosoftAccountAD)({
                    cuenta: params.cuenta,
                    password: params.password
                });
                if (!result.isSuccess) {
                    throw new Error((_a = result.errorMessage) !== null && _a !== void 0 ? _a : 'Query failed');
                }
                return result.data[0];
            }
            catch (error) {
                throw new Error((_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "Error al ejecutar conexión");
            }
        },
        async executeConnection_FileBinary(sql, tipoConsulta, params, datoBinario) {
            var _a, _b;
            try {
                const result = await (0, bd_connectionBinaryFile_service_1.executeQuery_BinaryFile)({
                    TipoConsulta: tipoConsulta,
                    Consulta: sql,
                    Parametros: params,
                    Binario: datoBinario
                });
                if (!result.isSuccess) {
                    throw new Error((_a = result.errorMessage) !== null && _a !== void 0 ? _a : 'Query failed');
                }
                return result.data;
            }
            catch (error) {
                throw new Error((_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "Error al ejecutar conexión");
            }
        },
    };
}
