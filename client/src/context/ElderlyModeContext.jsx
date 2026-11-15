import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ElderlyModeContext = createContext(null);

export function ElderlyModeProvider({ children }) {
  const { user, toggleElderlyMode: persistElderlyMode } = useAuth();
  const [elderlyMode, setElderlyMode] = useState(() => {
    const saved = localStorage.getItem('eldercare_elderly_mode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Sync with user preference when user logs in
  useEffect(() => {
    if (user?.elderlyMode !== undefined) {
      setElderlyMode(Boolean(user.elderlyMode));
      localStorage.setItem('eldercare_elderly_mode', JSON.stringify(Boolean(user.elderlyMode)));
    }
  }, [user?.elderlyMode]);

  // Apply or remove body class for high-contrast & enlarged fonts
  useEffect(() => {
    if (elderlyMode) {
      document.body.classList.add('elderly-mode-active');
    } else {
      document.body.classList.remove('elderly-mode-active');
    }
  }, [elderlyMode]);

  const toggle = (forceValue) => {
    const newVal = forceValue !== undefined ? forceValue : !elderlyMode;
    setElderlyMode(newVal);
    localStorage.setItem('eldercare_elderly_mode', JSON.stringify(newVal));
    if (user) {
      persistElderlyMode(newVal);
    }
  };

  return (
    <ElderlyModeContext.Provider value={{ elderlyMode, toggle }}>
      {children}
    </ElderlyModeContext.Provider>
  );
}

export function useElderlyMode() {
  const context = useContext(ElderlyModeContext);
  if (!context) throw new Error('useElderlyMode must be used within an ElderlyModeProvider');
  return context;
}
