import React, { createContext, useState, useEffect, useRef, useContext } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ── Cifrado AES-GCM para ocultar user_session del DevTools ──────────────────
const _CK = "scii-medical-2025-tng";
const _CS = "scii-salt-v1";

async function _derivarClave() {
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey("raw", enc.encode(_CK), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(_CS), iterations: 10000, hash: "SHA-256" },
    mat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function cifrarSesion(data) {
  const clave = await _derivarClave();
  const iv    = crypto.getRandomValues(new Uint8Array(12));
  const enc   = new TextEncoder();
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, enc.encode(JSON.stringify(data)));
  const buf   = new Uint8Array(iv.byteLength + cifrado.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(cifrado), iv.byteLength);
  return btoa(String.fromCharCode(...buf));
}

async function descifrarSesion(texto) {
  const clave    = await _derivarClave();
  const combined = Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
  const iv       = combined.slice(0, 12);
  const datos    = combined.slice(12);
  const descifrado = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, clave, datos);
  return JSON.parse(new TextDecoder().decode(descifrado));
}
// ────────────────────────────────────────────────────────────────────────────

// ── Decodifica el campo "exp" del JWT sin librerías externas ─────────────────
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null; // convierte a ms
  } catch {
    return null;
  }
}

// ── Verifica si el token almacenado ya expiró ────────────────────────────────
function isTokenExpired(token) {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionTimer          = useRef(null); // referencia al setTimeout activo

  // ── Programa el cierre de sesión automático al expirar el JWT ───────────────
  const scheduleAutoLogout = (token) => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const msUntilExpiry = expiry - Date.now();
    if (msUntilExpiry <= 0) {
      // Ya expiró: cerrar sesión inmediatamente
      performLogout();
      return;
    }

    sessionTimer.current = setTimeout(() => {
      performLogout();
    }, msUntilExpiry);
  };

  // ── Limpia estado y localStorage (sin navegar) ───────────────────────────────
  const performLogout = () => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    setUser(null);
    localStorage.removeItem("user_session");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("lastMfaValidation");
  };

  // ── Al montar: restaurar sesión o limpiar si el token ya expiró ──────────────
  useEffect(() => {
    (async () => {
      const storedSession = localStorage.getItem("user_session");
      const storedToken   = localStorage.getItem("auth_token");

      try {
        if (storedToken && isTokenExpired(storedToken)) {
          // Token expirado → limpiar todo sin redirigir (ProtectedRoute lo hace)
          performLogout();
        } else if (storedSession && storedSession !== "undefined") {
          // const userData = await descifrarSesion(storedSession);
          // setUser(userData);
          // setUser(storedSession);
          setUser(JSON.parse(storedSession));
          if (storedToken) scheduleAutoLogout(storedToken);
        } else {
          localStorage.removeItem("user_session");
        }
      } catch (error) {
        console.error("Error parsing session:", error);
        performLogout();
      } finally {
        setLoading(false);
      }
    })();

    // Limpiar timer al desmontar
    return () => {
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    };
  }, []);

  // ── PASO 1: Verificar existencia en AD + validar credenciales ───────────────
  const loginStepOne = async (usuario, password) => {
    try {
      const account = usuario.toLowerCase().trim();

      const existRes = await fetch(`${API_BASE_URL}/LoginToken/existAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      if (!existRes.ok) {
        return { success: false, message: "Error al verificar el usuario." };
      }

      const userExists = await existRes.json().catch(() => null);
      if (!userExists) {
        return { success: false, message: "Usuario no encontrado." };
      }

      // checkAccountStatus

      const validateRes = await fetch(`${API_BASE_URL}/LoginToken/validateAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, paramsSql: [password.trim()] }),
      });

      if (!validateRes.ok) {
        return { success: false, message: "Error al validar las credenciales." };
      }

      const isValid = await validateRes.json().catch(() => null);
      if (!isValid) {
        return { success: false, message: "Usuario o contraseña incorrectos." };
      }

      const statusRes = await fetch(`${API_BASE_URL}/LoginToken/checkAccountStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      // Error HTTP real (403, 500, etc.)
      if (!statusRes.ok) {
        const statusData = await statusRes.json().catch(() => null);
        return { success: false, message: statusData?.message || "Acceso denegado." };
      }

      // HTTP 200 pero con flags en el body (ej. mfa: false)
      const statusData = await statusRes.json().catch(() => null);

      if (statusData?.mfa === false) {
        // console.log("objeto MFA: ");
        // console.table(statusData?.object);

        return {
          success: false,
          mfaSetup: true,
          user: { usuario: account },
          mfaData: statusData
        };
      }


      
      return { success: true, user: { usuario: account } };

    } catch (error) {
      console.error("Login Step One Error:", error);
      return { success: false, message: "Error de conexión con el servidor." };
    }
  };

  const loginStepTwo = async (userData, mfaCode) => {
    try {
      const account = userData?.usuario ?? "";

      const mfaRes = await fetch(`${API_BASE_URL}/LoginToken/validateMfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, authenticatorCode: mfaCode }),
      });

      const result = await mfaRes.json().catch(() => null);

      if (!mfaRes.ok) {
        const msg = result?.message || "Error al validar código de autenticación.";
        return { success: false, message: msg };
      }

      if (!result || result.valid !== true) {
        return { success: false, message: "Código incorrecto. Intenta de nuevo." };
      }

      localStorage.setItem("lastMfaValidation", Date.now().toString());
      // localStorage.setItem("user_session", await cifrarSesion(result.user));
      localStorage.setItem("user_session", JSON.stringify(result.user));
      localStorage.setItem("auth_token", result.token);
      setUser(result.user);

      scheduleAutoLogout(result.token);

      return { success: true };

    } catch (error) {
      console.error("Login Step Two Error:", error);
      return { success: false, message: "Error al procesar autenticación." };
    }
  };

  const loginDirect = (userData, token) => {
    localStorage.setItem("lastMfaValidation", Date.now().toString());
    localStorage.setItem("user_session", JSON.stringify(userData));
    localStorage.setItem("auth_token", token);
    setUser(userData);
    scheduleAutoLogout(token);
  };

  const logout = () => {
    performLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loginStepOne, loginStepTwo, loginDirect, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
