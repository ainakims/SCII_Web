"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginController = LoginController;
const jwt = require("jsonwebtoken");
const authenticator_1 = require("@otp-lib/authenticator");
const params_web_service_1 = require("../interfaces/params_web_service");
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const JWT_SECRET = process.env.JWT_SECRET;
const normalizeMatricula = (matricula) => {
    if (!matricula)
        return "";
    const value = String(matricula).trim();
    if (!/^\d+$/.test(value))
        return value;
    const num = parseInt(value, 10);
    if (num >= 100000) {
        return value.slice(0, 1) + value.slice(2);
    }
    return value;
};
function LoginController(db) {
    const { executeConnection, validationMicrosoftAccountAD } = db;
    const existMicrosoftAccount = async (req, res) => {
        try {
            const { account } = req.body;
            const params = [
                { Nombre: "@Usuario", Valor: account },
                { Nombre: "@UnidadNegocio", Valor: "TNG" },
            ];
            const sql = "APR.DBO.APR_VerificaEdoUsuarioAD";
            const result = await executeConnection(sql, params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
            const verifiedUser = result[0];
            res.json(verifiedUser);
            return verifiedUser;
        }
        catch (error) {
            res.status(500).json({ error: "Error interno", message: error.message });
            return false;
        }
    };
    /**
     * @param req
     * @param res
     * @returns
     * Validar credenciales de usuario con el AD
     */
    const valideteMicrosoftAccount = async (req, res) => {
        var _a;
        try {
            const { account, paramsSql } = req.body;
            const paramsAD = {
                cuenta: String(account),
                password: String((_a = paramsSql === null || paramsSql === void 0 ? void 0 : paramsSql[0]) !== null && _a !== void 0 ? _a : ""),
            };
            const result = await validationMicrosoftAccountAD(paramsAD);
            res.json(result);
            return result;
        }
        catch (error) {
            res.status(500).json({ error: error.message });
            return false;
        }
    };
    const generarCodigosAutenticacion = async (cuentaUsuario) => {
        try {
            const secret = speakeasy_1.default.generateSecret({
                length: 10,
                // name: cuentaUsuario,
                // issuer: "SIA",
            });
            const label = encodeURIComponent(cuentaUsuario); // SOLO usuario
            const issuer = encodeURIComponent("SIA");
            const otpauth = `otpauth://totp/${label}?secret=${secret.base32}&issuer=${issuer}`;
            // const qr = await QRCode.toDataURL(secret.otpauth_url!);
            const qr = await qrcode_1.default.toDataURL(otpauth);
            return {
                secretKey: secret.hex.slice(0, 10),
                manualEntryKey: secret.base32,
                userTitle: cuentaUsuario.trim(),
                authenticationTitle: cuentaUsuario.trim(),
                authenticationBarCodeImage: qr,
                authenticationManualCode: secret.base32,
            };
        }
        catch {
            return null;
        }
    };
    /**
     * Verificar estado de cuenta antes del MFA
     */
    const checkAccountStatus = async (req, res) => {
        try {
            const { account } = req.body;
            const adParams = [
                { Nombre: "@Usuario", Valor: account },
                { Nombre: "@UnidadNegocio", Valor: "TNG" },
            ];
            const adResult = await executeConnection("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, adParams);
            if (adResult.length === 0) {
                res.status(403).json({ message: "No se pudo encontrar el usuario en el directorio." });
                return false;
            }
            if (adResult[0].EstadoCuenta === "Bloqueada") {
                res.status(403).json({ message: "Cuenta de usuario bloqueada." });
                return false;
            }
            const sciiParams = [{ Nombre: "@Usuario", Valor: account }];
            const sciiResult = await executeConnection("SELECT ID, Activo FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario", params_web_service_1.TipoConsulta.Consulta, sciiParams);
            if (sciiResult.length > 0 && sciiResult[0].Activo === 'false') {
                res.status(403).json({ message: "Cuenta de usuario dada de baja." });
                return false;
            }
            const estadoMFA = await getUserSecretKey(account);
            if (String(estadoMFA.ID) <= "0") {
                const result = await generarCodigosAutenticacion(account);
                res.json({ ok: false, mfa: false, object: result, id: estadoMFA.ID });
                return false;
            }
            else {
                const result = await generarCodigosAutenticacion(account);
                if (String(estadoMFA.Estado) === "false") {
                    res.json({ ok: false, mfa: false, object: result, id: estadoMFA.ID });
                    return false;
                }
            }
            res.json({ ok: true, mfa: true });
            return true;
        }
        catch (error) {
            res.status(500).json({ error: "Error interno", message: error.message });
            return false;
        }
    };
    /**
     * @param account
     * @returns
     * Obtener clave secreta MFA del usuario
     */
    const getUserSecretKey = async (account) => {
        const params = [
            { Nombre: "@Cuenta_Usuario", Valor: account },
            { Nombre: "@UnidadNegocio", Valor: "TNG" },
        ];
        const result = await executeConnection("APR.dbo.2FA_ObtenerCodigosAutenticacion", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, params);
        return result[0];
    };
    const authenticateAccountWithMFA = async (req, res) => {
        try {
            const { account, authenticatorCode } = req.body;
            /**
             * Verificar estado de cuenta en AD
             */
            const adParams = [
                { Nombre: "@Usuario", Valor: account },
                { Nombre: "@UnidadNegocio", Valor: "TNG" },
            ];
            const userResult = await executeConnection("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, adParams);
            if (userResult.length === 0) {
                res.status(403).json({ message: "No se pudo encontrar el usuario en el directorio." });
                return false;
            }
            if (userResult[0].EstadoCuenta === "Bloqueada") {
                res.status(403).json({ message: "Cuenta de usuario bloqueada." });
                return false;
            }
            const sciiParams = [
                { Nombre: "@Usuario", Valor: account },
            ];
            const sciiResult = await executeConnection("SELECT ID, Usuario, Nombre, Rol, Id_Rol, Email, Activo, Matricula FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario", params_web_service_1.TipoConsulta.Consulta, sciiParams);
            if (sciiResult.length > 0 && sciiResult[0].Activo === 'false') {
                res.status(403).json({ message: "Cuenta de usuario dada de baja." });
                return false;
            }
            /**
             * Validar código MFA
             */
            const mfaUserData = await getUserSecretKey(account);
            const secret = authenticator_1.Secret.fromBase32(mfaUserData.ManualEntryKey);
            const totp = new authenticator_1.TOTP({ secret, account: account, issuer: "SCII" });
            const verified = await totp.verify(authenticatorCode);
            /**
             * Comentar para omitir authenticator
             */
            // if (!verified) {
            //   res.json(false);
            //   return false;
            // }
            /**
             * Construir payload
             */
            let payload = {};
            const adUser = userResult[0];
            if (sciiResult.length > 0) {
                payload = {
                    id: sciiResult[0].ID,
                    matricula: sciiResult[0].Matricula,
                    nombre: sciiResult[0].Nombre,
                    cuenta: sciiResult[0].Usuario,
                    correo: sciiResult[0].Email,
                    puesto: (adUser === null || adUser === void 0 ? void 0 : adUser.Title) || '',
                    estado: sciiResult[0].Activo,
                    rol: sciiResult[0].Rol,
                };
            }
            else {
                payload = {
                    id: "",
                    matricula: normalizeMatricula(adUser === null || adUser === void 0 ? void 0 : adUser.Matricula),
                    nombre: adUser === null || adUser === void 0 ? void 0 : adUser.DisplayName,
                    cuenta: adUser === null || adUser === void 0 ? void 0 : adUser.Login,
                    correo: adUser === null || adUser === void 0 ? void 0 : adUser.Email,
                    puesto: adUser === null || adUser === void 0 ? void 0 : adUser.Title,
                    estado: adUser === null || adUser === void 0 ? void 0 : adUser.EstadoCuenta,
                    rol: 'Usuario',
                };
            }
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
            res.json({ valid: true, token, user: payload });
            return true;
        }
        catch (error) {
            res.status(500).json({ error: "Error interno", message: error.message });
            return false;
        }
    };
    const ValidarCodigoMFA = async (req, res) => {
        try {
            const { id, account, secretKey, manualEntryKey, qr, code } = req.body;
            if (!account || !manualEntryKey || !code) {
                return res.status(400).json({ ok: false, message: "Faltan parámetros." });
            }
            const verified = speakeasy_1.default.totp.verify({
                secret: manualEntryKey,
                encoding: "base32",
                token: String(code),
                window: 1,
            });
            if (!verified) {
                return res.json({ ok: false, message: "Código incorrecto." });
            }
            const esNuevo = Number(id) <= 0;
            if (esNuevo) {
                const insertParams = [
                    { Nombre: "@Cuenta_Autenticar", Valor: account },
                    { Nombre: "@SecretKey", Valor: secretKey },
                    { Nombre: "@ManualEntryKey", Valor: manualEntryKey },
                    { Nombre: "@BarCodeImg", Valor: qr !== null && qr !== void 0 ? qr : "" },
                    { Nombre: "@Cuenta_Usuario", Valor: account },
                    { Nombre: "@Estado", Valor: "true" },
                ];
                await executeConnection(`INSERT INTO [10.133.8.77].[BU2FA].[dbo].[SIACuentasAutenticacion]
           (Cuenta_Autenticar, SecretKey, ManualEntryKey, BarCodeImg, Cuenta_Usuario, Estado, General)
           VALUES (@Cuenta_Autenticar, @SecretKey, @ManualEntryKey, @BarCodeImg, @Cuenta_Usuario, @Estado, '')`, params_web_service_1.TipoConsulta.Consulta, insertParams);
            }
            else {
                const updateParams = [
                    { Nombre: "@ID", Valor: id },
                    { Nombre: "@SecretKey", Valor: secretKey },
                    { Nombre: "@ManualEntryKey", Valor: manualEntryKey },
                    { Nombre: "@BarCodeImg", Valor: qr !== null && qr !== void 0 ? qr : "" },
                    { Nombre: "@Estado", Valor: "true" },
                ];
                await executeConnection(`UPDATE [10.133.8.77].[BU2FA].[dbo].[SIACuentasAutenticacion]
           SET SecretKey = @SecretKey, ManualEntryKey = @ManualEntryKey, BarCodeImg = @BarCodeImg, Estado = @Estado, General = ''
           WHERE id = @ID`, params_web_service_1.TipoConsulta.Consulta, updateParams);
            }
            // Construir token JWT para dar acceso inmediato
            const adParams = [
                { Nombre: "@Usuario", Valor: account },
                { Nombre: "@UnidadNegocio", Valor: "TNG" },
            ];
            const adResult = await executeConnection("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", params_web_service_1.TipoConsulta.ProcedimientoAlmacenado, adParams);
            const sciiParams = [{ Nombre: "@Usuario", Valor: account }];
            const sciiResult = await executeConnection("SELECT ID, Usuario, Nombre, Rol, Id_Rol, Email, Activo, Matricula FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario", params_web_service_1.TipoConsulta.Consulta, sciiParams);
            const adUser = adResult[0];
            let payload = {};
            if (sciiResult.length > 0) {
                payload = {
                    id: sciiResult[0].ID,
                    matricula: sciiResult[0].Matricula,
                    nombre: sciiResult[0].Nombre,
                    cuenta: sciiResult[0].Usuario,
                    correo: sciiResult[0].Email,
                    puesto: (adUser === null || adUser === void 0 ? void 0 : adUser.Title) || '',
                    estado: sciiResult[0].Activo,
                    rol: sciiResult[0].Rol,
                };
            }
            else {
                payload = {
                    id: "",
                    matricula: normalizeMatricula(adUser === null || adUser === void 0 ? void 0 : adUser.Matricula),
                    nombre: adUser === null || adUser === void 0 ? void 0 : adUser.DisplayName,
                    cuenta: adUser === null || adUser === void 0 ? void 0 : adUser.Login,
                    correo: adUser === null || adUser === void 0 ? void 0 : adUser.Email,
                    puesto: adUser === null || adUser === void 0 ? void 0 : adUser.Title,
                    estado: adUser === null || adUser === void 0 ? void 0 : adUser.EstadoCuenta,
                    rol: 'Usuario',
                };
            }
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
            return res.json({ ok: true, valid: true, token, user: payload, message: "MFA activado correctamente." });
        }
        catch (error) {
            return res.status(500).json({ ok: false, error: "Error interno", message: error.message });
        }
    };
    return { existMicrosoftAccount, valideteMicrosoftAccount, checkAccountStatus, authenticateAccountWithMFA, ValidarCodigoMFA };
}
