'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'ngo';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  organizationId?: string;
  organizationName?: string;
  organizationLogoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'floodguard-user-v2';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('floodguard-user');
          return;
        }

        const data = await response.json();
        const serverUser = data.user as User | null;

        if (serverUser) {
          setUser(serverUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverUser));
        } else {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('floodguard-user');
        }
      } catch {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      // Call the real auth API backed by Neon PostgreSQL
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      const userData: User = data.user;
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    // Also clear old key if present
    localStorage.removeItem('floodguard-user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
