import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type SessionMode = 'parent' | 'child' | null;

export interface SessionModeContextType {
  sessionMode: SessionMode;
  setSessionMode: (mode: SessionMode) => void;
  resetSessionMode: () => void;
}

const SessionModeContext = createContext<SessionModeContextType | null>(null);

export const SessionModeProvider: React.FC<{
  children: React.ReactNode;
  initialMode?: SessionMode;
}> = ({ children, initialMode = null }) => {
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    // Graceful fallback if rendered outside AuthProvider
  }

  // Pure memory-only state: strictly NO localStorage used, refresh always starts from null
  const [sessionMode, setSessionMode] = useState<SessionMode>(initialMode);

  // Auto-reset to null on user logout
  useEffect(() => {
    if (!user) {
      setSessionMode(null);
    }
  }, [user]);

  const resetSessionMode = () => {
    setSessionMode(null);
  };

  return (
    <SessionModeContext.Provider value={{ sessionMode, setSessionMode, resetSessionMode }}>
      {children}
    </SessionModeContext.Provider>
  );
};

export const useSessionMode = (): SessionModeContextType => {
  const context = useContext(SessionModeContext);
  if (!context) {
    // Defensive fallback when rendered outside SessionModeProvider (e.g. existing integration tests)
    return {
      sessionMode: 'parent',
      setSessionMode: () => {},
      resetSessionMode: () => {},
    };
  }
  return context;
};
