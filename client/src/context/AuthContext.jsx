import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('eldercare_token');
    if (token) {
      api.getMe()
        .then(data => {
          setUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem('eldercare_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('eldercare_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem('eldercare_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('eldercare_token');
    localStorage.removeItem('eldercare_active_profile_id');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      return data;
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const toggleElderlyMode = async (enabled) => {
    try {
      await api.toggleElderlyMode(enabled);
      setUser(prev => prev ? { ...prev, elderlyMode: enabled } : prev);
    } catch (err) {
      console.error('Failed to update elderly mode on backend:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        toggleElderlyMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
