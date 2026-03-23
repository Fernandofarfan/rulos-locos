import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'rl_token';

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    twoFactorEnabled?: boolean;
    telegramId?: string;
    apiKeys?: any[];
}

interface LoginPayload { email: string; password: string; twoFactorCode?: string; }
interface RegisterPayload extends LoginPayload { name?: string; }

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    login: (payload: LoginPayload) => Promise<{ ok: boolean; require2fa?: boolean; userId?: string }>;
    register: (payload: RegisterPayload) => Promise<{ ok: boolean }>;
    loginWithGoogle: (credential: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => localStorage.getItem(TOKEN_KEY);

    const applyToken = (token: string) => {
        localStorage.setItem(TOKEN_KEY, token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    };

    const clearAuth = () => {
        localStorage.removeItem(TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const fetchMe = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            applyToken(token); // Ensure it's in headers before calling
            const r = await axios.get<AuthUser>(`${API_BASE}/auth/me`);
            setUser(r.data);
        } catch {
            clearAuth();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    const login = async (payload: LoginPayload) => {
        setError(null);
        try {
            const { data } = await axios.post(`${API_BASE}/auth/login`, payload);
            if (data.require2fa) {
                return { ok: false, require2fa: true, userId: data.userId };
            }
            applyToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (e: any) {
            const msg = e?.response?.data?.error || 'Error al iniciar sesión';
            setError(msg);
            return { ok: false };
        }
    };

    const register = async (payload: RegisterPayload) => {
        setError(null);
        try {
            const { data } = await axios.post(`${API_BASE}/auth/register`, payload);
            applyToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (e: any) {
            const msg = e?.response?.data?.error || 'Error al registrarse';
            setError(msg);
            return { ok: false };
        }
    };

    const loginWithGoogle = async (credential: string) => {
        setError(null);
        try {
            const { data } = await axios.post(`${API_BASE}/auth/google`, { credential });
            applyToken(data.token);
            setUser(data.user);
            return true;
        } catch (e: any) {
            const msg = e?.response?.data?.error || 'Falló autenticación con Google';
            setError(msg);
            return false;
        }
    };

    const logout = () => clearAuth();

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login,
            register,
            loginWithGoogle,
            logout,
            isAuthenticated: !!user,
            refreshUser: fetchMe
        }}>
            {children}
        </AuthContext.Provider>
    );
};
