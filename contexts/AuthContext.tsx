import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureProfileExists } from '../lib/ensureProfile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery')
      );
    }
    return false;
  });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check URL parameters directly on mount
    const checkRecoveryInUrl = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setIsPasswordRecovery(true);
      }
    };
    checkRecoveryInUrl();

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      checkRecoveryInUrl();
      if (currentUser) {
        ensureProfileExists(currentUser);
      }
    }).catch(() => {
      setLoading(false);
    });

    // 2. Auth state change listener with robust PASSWORD_RECOVERY detection
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const isRecovery =
        event === 'PASSWORD_RECOVERY' ||
        hash.includes('type=recovery') ||
        search.includes('type=recovery');

      if (isRecovery) {
        setIsPasswordRecovery(true);
      }
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        ensureProfileExists(currentUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error('Supabase არ არის კონფიგურირებული') };
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: new Error(err.message || 'რეგისტრაციის შეცდომა') };
    }
  };

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error('Supabase არ არის კონფიგურირებული') };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: new Error(err.message || 'შესვლის შეცდომა') };
    }
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error('Supabase არ არის კონფიგურირებული') };
    }
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: new Error(err.message || 'პაროლის აღდგენის შეცდომა') };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error('Supabase არ არის კონფიგურირებული') };
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) {
        setIsPasswordRecovery(false);
      }
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: new Error(err.message || 'პაროლის განახლების შეცდომა') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
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
