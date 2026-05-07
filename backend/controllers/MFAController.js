const jwt = require("jsonwebtoken");
const { poolPromise, sql } = require("../server/config/db");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const RevisarMFA = async (req, res) => {
  const { usuario } = req.body;

  const result = await pool
    .request()
    .input("usuario", sql.VarChar, usuario)
    .query("SELECT * FROM FROM [BU2FA].[dbo].[SIACuentasAutenticacion] WHERE Cuenta_Autenticar=@usuario");

  if (result.recordset.length === 0) {
    return res.json({ exists: false });
  }

  const data = result.recordset[0];

  res.json({
    exists: true,
    secret: data.SecretKey,
    status: data.Estado,
  });
};

const ValidarMFA = async (req, res) => {
  const { usuario, codigo } = req.body;

  const result = await pool
    .request()
    .input("usuario", sql.VarChar, usuario)
    .query(
      "SELECT SecretKey FROM [BU2FA].[dbo].[SIACuentasAutenticacion] WHERE Cuenta_Autenticar=@usuario",
    );

  if (result.recordset.length === 0) {
    return res.status(400).json({ success: false });
  }

  const secret = result.recordset[0].SecretKey;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: codigo,
    window: 1,
  });

  res.json({ success: verified });
};

const GenerarMFA = async (req, res) => {
  const { usuario } = req.body;

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `SIA (${usuario})`
  });

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  await pool.request()
    .input("usuario", sql.VarChar, usuario)
    .input("secretkey", sql.VarChar, secret.base32)
    .query(`
      INSERT INTO [BU2FA].[dbo].[SIACuentasAutenticacion] (Cuenta_UAutenticar, SecretKey, Estado)
      VALUES (@usuario, @secretkey, 1)
    `);

  res.json({
    secret: secret.base32,
    qr
  });
};

const ValidarCodigoMFA = async (req, res) => {
  const { account, authenticationCode, code } = req.body;

  if (!account || !authenticationCode || !code) {
    return res.status(400).json({ ok: false, message: "Faltan parámetros." });
  }

  // Verificar que el código de 6 dígitos coincide con el secret generado
  const verified = speakeasy.totp.verify({
    secret:   authenticationCode,
    encoding: "base32",
    token:    code,
    window:   1, // tolera ±30 segundos de desfase
  });

  if (!verified) {
    return res.json({ ok: false, message: "Código incorrecto. Intente de nuevo." });
  }

  // Código válido → guardar secret en BD y activar MFA
  // TODO: ajustar query/SP según tu estructura de BD
  // await pool.request()
  //   .input("usuario",   sql.VarChar, account)
  //   .input("secretkey", sql.VarChar, authenticationCode)
  //   .query(`
  //     UPDATE [BU2FA].[dbo].[SIACuentasAutenticacion]
  //     SET    SecretKey = @secretkey, Estado = 1
  //     WHERE  Cuenta_Autenticar = @usuario
  //   `);

  return res.json({ ok: true, message: "MFA activado correctamente." });
};

module.exports = {
  RevisarMFA,
  GenerarMFA,
  ValidarMFA,
  ValidarCodigoMFA,
};
