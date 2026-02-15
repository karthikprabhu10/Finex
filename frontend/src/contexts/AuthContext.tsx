import React, { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authApi } from '../services/supabase';
import { AuthContext, type AuthContextType } from './AuthContextType';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing...');
        const { session, error } = await authApi.getSession();
        if (error) {
          console.warn('[Auth] Session error:', error);
          // Don't throw - just set loading to false and continue
        }

        if (session) {
          console.log('[Auth] Session found:', session.user?.email);
          setSession(session);
          setUser(session.user);
        } else {
          console.log('[Auth] No active session');
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error('[Auth] Initialization error:', error);
        // Don't set error state - just log it and continue
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set timeout to ensure we don't stay in loading state forever
    const timeout = setTimeout(() => {
      console.log('[Auth] Timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authApi.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Store or remove token from localStorage
      if (session?.access_token) {
        localStorage.setItem('supabase_token', session.access_token);
      } else {
        localStorage.removeItem('supabase_token');
      }
    });

    return () => {
      unsubscribe?.subscription?.unsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      const { data, error } = await authApi.signUp(email, password, fullName);
      if (error) throw error;

      // Session might not be set immediately after signup (if email confirmation is required)
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
    } catch (err) {
      const error = err as { message?: string };
      const message = error?.message || 'Sign up failed';
      setError(message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await authApi.signIn(email, password);
      if (error) throw error;

      setSession(data.session);
      setUser(data.user);
    } catch (err) {
      const error = err as { message?: string };
      const message = error?.message || 'Sign in failed';
      setError(message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await authApi.signOut();
      if (error) throw error;

      setSession(null);
      setUser(null);
      
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (err) {
      const error = err as { message?: string };
      const message = error?.message || 'Sign out failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
