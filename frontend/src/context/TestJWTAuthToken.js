import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Verifica sesión usando cookie JWT
  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/LoginToken/VerificarSesion`, {
        method: "GET",
        credentials: "include"
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.usuario);

    } catch (err) {
      console.error("Auth check error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 🔹 Paso 1 (igual, pero ya no maneja sesión)
  const loginStepOne = async (usuario, password) => {
    const res = await fetch(`${API_BASE_URL}/LoginToken/ObtenerUsuario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ usuario, password })
    });

    return await res.json();
  };

  // 🔐 Paso 2 (MFA + JWT en cookie)
  const loginStepTwo = async (userData, code) => {
    const res = await fetch(`${API_BASE_URL}/LoginToken/ValidMFACuenta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuario: userData.Usuario,
        code
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      setUser(data.user);
    }

    return data;
  };

  // 🔓 Logout real (backend)
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/LoginToken/Logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginStepOne,
        loginStepTwo,
        logout,
        loading,
        isAuthenticated: !!user
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};