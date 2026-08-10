import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import type { Usuario } from "../types";

interface AuthContextValue {
  user: Usuario | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: Usuario }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ user: Usuario }>("/auth/register", { name, email, password });
    setUser(res.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: Usuario }>("/auth/login", { email, password });
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (name: string, email: string) => {
    const res = await api.patch<{ user: Usuario }>("/auth/me", { name, email });
    setUser(res.user);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post("/auth/change-password", { currentPassword, newPassword });
  }, []);

  /**
   * O backend responde a mesma mensagem exista ou não a conta, de propósito —
   * é o que impede descobrir quais e-mails estão cadastrados.
   */
  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.post("/auth/reset-password", { token, newPassword });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      updateProfile,
      changePassword,
      forgotPassword,
      resetPassword,
    }),
    [
      user,
      loading,
      register,
      login,
      logout,
      updateProfile,
      changePassword,
      forgotPassword,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível completar a operação. Tente novamente.";
}
