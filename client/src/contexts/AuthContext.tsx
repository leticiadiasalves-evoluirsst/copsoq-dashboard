import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "copsoq_auth_token";

function decodeIsAdmin(token: string | null): boolean {
  if (!token) return false;
  try {
    const encodedPayload = token.split(":")[0];
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = atob(base64);
    const parts = payload.split(":");
    return parts[parts.length - 2] === "1";
  } catch {
    return false;
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const isAuthenticated = token !== null;
  const isAdmin = useMemo(() => decodeIsAdmin(token), [token]);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any).error || "Erro ao fazer login.");
    }
    const { token: newToken } = await res.json();
    if (remember) {
      localStorage.setItem(SESSION_KEY, newToken);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, newToken);
      localStorage.removeItem(SESSION_KEY);
    }
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isAdmin, token, login, logout }),
    [isAuthenticated, isAdmin, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
