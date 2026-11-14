/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import client, { getAccessToken, refreshAccessToken, setAccessToken } from '../services/api';

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
    loginWithGoogle: (credential: string, twoFactorCode?: string) => Promise<{ ok: boolean; require2fa?: boolean }>;
    logout: () => void;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const clearAuth = () => {
        setAccessToken(null);
        setUser(null);
    };

    const fetchMe = useCallback(async () => {
        if (!getAccessToken()) {
            setLoading(false);
            return;
        }
        try {
            const r = await client.get<AuthUser>('/auth/me');
            setUser(r.data);
        } catch {
            clearAuth();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        localStorage.removeItem('rl_token');
        localStorage.removeItem('rl_refresh');
        void refreshAccessToken().then(token => {
            if (token) return fetchMe();
            setLoading(false);
        });
    }, [fetchMe]);

    const login = async (payload: LoginPayload) => {
        setError(null);
        try {
            const { data } = await client.post('/auth/login', payload);
            if (data.require2fa) {
                return { ok: false, require2fa: true, userId: data.userId };
            }
            setAccessToken(data.token);
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
            const { data } = await client.post('/auth/register', payload);
            setAccessToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (e: any) {
            const msg = e?.response?.data?.error || 'Error al registrarse';
            setError(msg);
            return { ok: false };
        }
    };

    const loginWithGoogle = async (credential: string, twoFactorCode?: string) => {
        setError(null);
        try {
            const { data } = await client.post('/auth/google', { credential, twoFactorCode });
            if (data.require2fa) return { ok: false, require2fa: true };
            setAccessToken(data.token);
            setUser(data.user);
            return { ok: true };
        } catch (e: any) {
            const msg = e?.response?.data?.error || 'Falló autenticación con Google';
            setError(msg);
            return { ok: false };
        }
    };

    const logout = async () => {
        try {
            await client.post('/auth/logout', {}, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            clearAuth();
        } catch {
            setError('No se pudo cerrar la sesión.');
        }
    };

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
