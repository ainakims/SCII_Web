const jwt = require("jsonwebtoken");

import { DB } from "../server/config/db";
import { Request, Response } from "express";
import { TOTP, Secret } from "@otp-lib/authenticator";
import { Parametros, ParamsWebServiceAD, TipoConsulta } from "../interfaces/params_web_service";
import { verifyMicrosoftAccount, SIACuentasAutenticacion, DatosCuentaMicrosoft, mfaVerificationAccount } from "../interfaces/user_controller";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface Usuario {
  ID: number;
  Nombre: string;
  Rol: string;
  Id_Rol: number;
  Email: string;
  Activo: string;
  Matricula: string;
  Usuario: string;
}

const normalizeMatricula = (matricula: string | number | undefined): string => {
  if (!matricula) return "";

  const value = String(matricula).trim();

  if (!/^\d+$/.test(value)) return value;

  const num = parseInt(value, 10);

  if (num >= 100000) {
    return value.slice(0, 1) + value.slice(2);
  }

  return value;
};

export function LoginController(db: DB) {
  const { executeConnection, validationMicrosoftAccountAD } = db;

  const existMicrosoftAccount = async (req: Request, res: Response): Promise<boolean> => {
    try {
      const { account }: verifyMicrosoftAccount = req.body;
      const params: Parametros[] = [
        { Nombre: "@Usuario",        Valor: account },
        { Nombre: "@UnidadNegocio",  Valor: "TNG"  },
      ];

      const sql = "APR.DBO.APR_VerificaEdoUsuarioAD";
      const result = await executeConnection<boolean>(sql, TipoConsulta.ProcedimientoAlmacenado, params);
      const verifiedUser: boolean = result[0];
      res.json(verifiedUser);
      return verifiedUser;
    } catch (error: any) {
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
  const valideteMicrosoftAccount = async (req: Request, res: Response): Promise<boolean> => {
    try {
      const { account, paramsSql }: verifyMicrosoftAccount = req.body;

      const paramsAD: ParamsWebServiceAD = {
        cuenta:   String(account),
        password: String(paramsSql?.[0] ?? ""),
      };

      const result = await validationMicrosoftAccountAD<boolean>(paramsAD);
      res.json(result);
      return result;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return false;
    }
  };

  const generarCodigosAutenticacion = async (cuentaUsuario: string) => {
    try {
      const secret = speakeasy.generateSecret({
        length: 10,
        // name: cuentaUsuario,
        // issuer: "SIA",
      });

      const label = encodeURIComponent(cuentaUsuario); // SOLO usuario
      const issuer = encodeURIComponent("SIA");
      
      const otpauth = `otpauth://totp/${label}?secret=${secret.base32}&issuer=${issuer}`;

      // const qr = await QRCode.toDataURL(secret.otpauth_url!);
      const qr = await QRCode.toDataURL(otpauth);

      return {
        secretKey: secret.hex.slice(0, 10),
        manualEntryKey: secret.base32,
        userTitle: cuentaUsuario.trim(),
        authenticationTitle: cuentaUsuario.trim(),
        authenticationBarCodeImage: qr,
        authenticationManualCode: secret.base32,
      };
    } catch {
      return null;
    }
  };

  /**
   * Verificar estado de cuenta antes del MFA
   */
  const checkAccountStatus = async (req: Request, res: Response): Promise<boolean> => {
    try {
      const { account } = req.body;

      const adParams: Parametros[] = [
        { Nombre: "@Usuario",       Valor: account },
        { Nombre: "@UnidadNegocio", Valor: "TNG"  },
      ];

      const adResult = await executeConnection<DatosCuentaMicrosoft>("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", TipoConsulta.ProcedimientoAlmacenado, adParams);

      if (adResult.length === 0) {
        res.status(403).json({ message: "No se pudo encontrar el usuario en el directorio." });
        return false;
      }

      if (adResult[0].EstadoCuenta === "Bloqueada") {
        res.status(403).json({ message: "Cuenta de usuario bloqueada." });
        return false;
      }

      const sciiParams: Parametros[] = [{ Nombre: "@Usuario", Valor: account }];
      const sciiResult = await executeConnection<Usuario>("SELECT ID, Activo FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario", TipoConsulta.Consulta, sciiParams);

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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno", message: error.message });
      return false;
    }
  };

  /**
   * @param account 
   * @returns
   * Obtener clave secreta MFA del usuario
   */
  const getUserSecretKey = async (account: string): Promise<SIACuentasAutenticacion> => {
    const params: Parametros[] = [
      { Nombre: "@Cuenta_Usuario", Valor: account },
      { Nombre: "@UnidadNegocio",  Valor: "TNG"  },
    ];

    const result = await executeConnection<SIACuentasAutenticacion>("APR.dbo.2FA_ObtenerCodigosAutenticacion", TipoConsulta.ProcedimientoAlmacenado, params);
    return result[0];
  };

  const authenticateAccountWithMFA = async (req: Request, res: Response): Promise<boolean> => {
    try {
      const { account, authenticatorCode }: mfaVerificationAccount = req.body;

      /**
       * Verificar estado de cuenta en AD
       */
      const adParams: Parametros[] = [
        { Nombre: "@Usuario",        Valor: account },
        { Nombre: "@UnidadNegocio",  Valor: "TNG"  },
      ];

      const userResult = await executeConnection<DatosCuentaMicrosoft>("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", TipoConsulta.ProcedimientoAlmacenado, adParams);

      if (userResult.length === 0) {
        res.status(403).json({ message: "No se pudo encontrar el usuario en el directorio." });
        return false;
      }

      if (userResult[0].EstadoCuenta === "Bloqueada") {
        res.status(403).json({ message: "Cuenta de usuario bloqueada." });
        return false;
      }

      const sciiParams: Parametros[] = [
        { Nombre: "@Usuario", Valor: account },
      ];

      const sciiResult = await executeConnection<Usuario>(
        "SELECT ID, Usuario, Nombre, Rol, Id_Rol, Email, Activo, Matricula FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario",
        TipoConsulta.Consulta,
        sciiParams
      );
      
      if (sciiResult.length > 0 && sciiResult[0].Activo === 'false') {
        res.status(403).json({ message: "Cuenta de usuario dada de baja." });
        return false;
      }

      /**
       * Validar código MFA
       */
      const mfaUserData = await getUserSecretKey(account);
      const secret = Secret.fromBase32(mfaUserData.ManualEntryKey);
      const totp = new TOTP({ secret, account: account, issuer: "SCII" });
      const verified: boolean = await totp.verify(authenticatorCode);

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
          id:        sciiResult[0].ID,
          matricula: sciiResult[0].Matricula,
          nombre:    sciiResult[0].Nombre,
          cuenta:    sciiResult[0].Usuario,
          correo:    sciiResult[0].Email,
          puesto:    adUser?.Title || '',
          estado:    sciiResult[0].Activo,
          rol:       sciiResult[0].Rol,
        };
      } else {
        payload = {
          id:        "",
          matricula: normalizeMatricula(adUser?.Matricula),
          nombre:    adUser?.DisplayName,
          cuenta:    adUser?.Login,
          correo:    adUser?.Email,
          puesto:    adUser?.Title,
          estado:    adUser?.EstadoCuenta,
          rol:       'Usuario',
        };
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
      res.json({ valid: true, token, user: payload });
      return true;
    } catch (error: any) {
      res.status(500).json({ error: "Error interno", message: error.message });
      return false;
    }
  };

  const ValidarCodigoMFA = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id, account, secretKey, manualEntryKey, qr, code } = req.body;

      if (!account || !manualEntryKey || !code) {
        return res.status(400).json({ ok: false, message: "Faltan parámetros." });
      }

      const verified = speakeasy.totp.verify({
        secret:   manualEntryKey,
        encoding: "base32",
        token:    String(code),
        window:   1,
      });

      if (!verified) {
        return res.json({ ok: false, message: "Código incorrecto." });
      }

      const esNuevo = Number(id) <= 0;
      
      if (esNuevo) {
        const insertParams: Parametros[] = [
          { Nombre: "@Cuenta_Autenticar", Valor: account },
          { Nombre: "@SecretKey",         Valor: secretKey },
          { Nombre: "@ManualEntryKey",    Valor: manualEntryKey },
          { Nombre: "@BarCodeImg",        Valor: qr ?? "" },
          { Nombre: "@Cuenta_Usuario",    Valor: account },
          { Nombre: "@Estado",            Valor: "true" },
        ];

        await executeConnection(
          `INSERT INTO [10.133.8.77].[BU2FA].[dbo].[SIACuentasAutenticacion]
           (Cuenta_Autenticar, SecretKey, ManualEntryKey, BarCodeImg, Cuenta_Usuario, Estado, General)
           VALUES (@Cuenta_Autenticar, @SecretKey, @ManualEntryKey, @BarCodeImg, @Cuenta_Usuario, @Estado, '')`,
          TipoConsulta.Consulta,
          insertParams
        );
      } else {
        const updateParams: Parametros[] = [
          { Nombre: "@ID",             Valor: id            },
          { Nombre: "@SecretKey",      Valor: secretKey     },
          { Nombre: "@ManualEntryKey", Valor: manualEntryKey },
          { Nombre: "@BarCodeImg",     Valor: qr ?? ""      },
          { Nombre: "@Estado",         Valor: "true"        },
        ];

        await executeConnection(
          `UPDATE [10.133.8.77].[BU2FA].[dbo].[SIACuentasAutenticacion]
           SET SecretKey = @SecretKey, ManualEntryKey = @ManualEntryKey, BarCodeImg = @BarCodeImg, Estado = @Estado, General = ''
           WHERE id = @ID`,
          TipoConsulta.Consulta,
          updateParams
        );
      }

      // Construir token JWT para dar acceso inmediato
      const adParams: Parametros[] = [
        { Nombre: "@Usuario",       Valor: account },
        { Nombre: "@UnidadNegocio", Valor: "TNG"   },
      ];
      const adResult = await executeConnection<DatosCuentaMicrosoft>("[TNGCORE].[dbo].[Obtener_DatosCuentaMicrosoftAD]", TipoConsulta.ProcedimientoAlmacenado, adParams);

      const sciiParams: Parametros[] = [{ Nombre: "@Usuario", Valor: account }];
      const sciiResult = await executeConnection<Usuario>(
        "SELECT ID, Usuario, Nombre, Rol, Id_Rol, Email, Activo, Matricula FROM [TNGCORE].[dbo].[SCII_Usuarios] WHERE Usuario = @Usuario",
        TipoConsulta.Consulta,
        sciiParams
      );

      const adUser = adResult[0];
      let payload = {};

      if (sciiResult.length > 0) {
        payload = {
          id:        sciiResult[0].ID,
          matricula: sciiResult[0].Matricula,
          nombre:    sciiResult[0].Nombre,
          cuenta:    sciiResult[0].Usuario,
          correo:    sciiResult[0].Email,
          puesto:    adUser?.Title || '',
          estado:    sciiResult[0].Activo,
          rol:       sciiResult[0].Rol,
        };
      } else {
        payload = {
          id:        "",
          matricula: normalizeMatricula(adUser?.Matricula),
          nombre:    adUser?.DisplayName,
          cuenta:    adUser?.Login,
          correo:    adUser?.Email,
          puesto:    adUser?.Title,
          estado:    adUser?.EstadoCuenta,
          rol:       'Usuario',
        };
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
      return res.json({ ok: true, valid: true, token, user: payload, message: "MFA activado correctamente." });

    } catch (error: any) {
      return res.status(500).json({ ok: false, error: "Error interno", message: error.message });
    }
  };

  return { existMicrosoftAccount, valideteMicrosoftAccount, checkAccountStatus, authenticateAccountWithMFA, ValidarCodigoMFA };
}