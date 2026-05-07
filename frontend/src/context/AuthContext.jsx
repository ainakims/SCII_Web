import React, { createContext, useState, useEffect, useContext } from 'react';
import API_BASE_URL from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        try {
            if (storedToken && storedUser && storedUser !== 'undefined') {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } else if (storedUser === 'undefined') {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error("Error parsing user from local storage:", error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (Correo, Contrasena) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/Login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Correo, Contrasena })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, message: data.message || 'Credenciales inválidas' };
            }
        } catch (error) {
            console.error("Login Context Error:", error);
            return { success: false, message: 'Fallo al conectar con el servidor de autenticación.' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
