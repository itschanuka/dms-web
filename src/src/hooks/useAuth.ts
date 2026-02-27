'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMe, signOut as authSignOut } from '@/lib/auth';
import type { EmployeeProfile } from '@/lib/auth';

interface AuthState {
  employee:    EmployeeProfile | null;
  isLoading:   boolean;
  isSignedIn:  boolean;
}

/**
 * useAuth hook
 *
 * Provides the current authenticated employee profile and auth state.
 * Listens to Supabase auth state changes to keep in sync.
 *
 * Usage:
 *   const { employee, isLoading, isSignedIn, signOut } = useAuth();
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    employee:   null,
    isLoading:  true,
    isSignedIn: false,
  });

  const loadEmployee = useCallback(async () => {
    const profile = await getMe();
    setState({
      employee:   profile,
      isLoading:  false,
      isSignedIn: !!profile,
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Load on mount
    void loadEmployee();

    // Listen to auth state changes (login, logout, session refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({ employee: null, isLoading: false, isSignedIn: false });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void loadEmployee();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadEmployee]);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await authSignOut();
    setState({ employee: null, isLoading: false, isSignedIn: false });
  }, []);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await loadEmployee();
  }, [loadEmployee]);

  return {
    employee:   state.employee,
    isLoading:  state.isLoading,
    isSignedIn: state.isSignedIn,
    signOut,
    refresh,
    // Convenience permission checks
    can: (permission: keyof EmployeeProfile['permissions']) =>
      state.employee?.role === 'admin' || (state.employee?.permissions[permission] ?? false),
    isAdmin:      state.employee?.role === 'admin',
    isManager:    state.employee?.role === 'manager',
    isSalesperson: state.employee?.role === 'salesperson',
    isAccountant: state.employee?.role === 'accountant',
  };
}
