import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { IUser } from '../types';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: () => void;
  updateUser: (data: Partial<IUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle Google OAuth callback token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchUser();
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue logout even if API call fails
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const googleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const updateUser = (data: Partial<IUser>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
