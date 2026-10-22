import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api, ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string; details?: any }>;
  logout: () => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLocalUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.get<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vb_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const updateLocalUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await api.post<{ user: User; token?: string }>('/api/auth/login', { email, password });
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('vb_token', data.token);
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err instanceof ApiError ? err.message : 'Network error or server unavailable';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (formData: any) => {
    try {
      const data = await api.post<{ user: User; token?: string }>('/api/auth/register', formData);
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('vb_token', data.token);
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      if (err instanceof ApiError) {
        return {
          success: false,
          error: err.message || 'Registration failed',
          details: err.data?.details,
        };
      }
      return { success: false, error: 'Network error or server unavailable' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout request encountered an issue:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vb_token');
      }
      setUser(null);
    }
  };

  const switchDemoRole = async (targetRole: Role) => {
    if (!import.meta.env.DEV) {
      console.warn('Role switching is disabled in production builds');
      return;
    }
    const roleMap: Record<Role, string> = {
      ADMIN: 'admin@vendorbridge.com',
      PROCUREMENT_OFFICER: 'officer@vendorbridge.com',
      MANAGER_APPROVER: 'manager@vendorbridge.com',
      VENDOR: 'vendor@infrasupplies.com',
    };
    await login(roleMap[targetRole], 'VendorBridge@2025');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, switchDemoRole, refreshUser, updateLocalUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
