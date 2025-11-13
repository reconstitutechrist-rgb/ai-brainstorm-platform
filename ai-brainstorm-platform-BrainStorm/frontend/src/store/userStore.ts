import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getCurrentUser, signOut } from '../services/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface UserState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
}

// Convert Supabase user to our User type
function convertSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // Initialize authentication - check for existing session
      initializeAuth: async () => {
        try {
          set({ isLoading: true });

          // Get current user from Supabase
          const supabaseUser = await getCurrentUser();
          const user = convertSupabaseUser(supabaseUser);

          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          });

          // Listen for auth state changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);

            const user = convertSupabaseUser(session?.user ?? null);
            set({
              user,
              isAuthenticated: !!user,
            });
          });
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Sign in with email and password
      signInWithEmail: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          const user = convertSupabaseUser(data.user);
          set({
            user,
            isAuthenticated: !!user,
          });

          return { error: null };
        } catch (error) {
          console.error('Error signing in:', error);
          return { error: error as Error };
        }
      },

      // Sign up with email and password
      signUpWithEmail: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          const user = convertSupabaseUser(data.user);
          set({
            user,
            isAuthenticated: !!user,
          });

          return { error: null };
        } catch (error) {
          console.error('Error signing up:', error);
          return { error: error as Error };
        }
      },

      // Set user directly (for compatibility)
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      // Logout
      logout: async () => {
        try {
          // End session before logging out
          const currentUser = useUserStore.getState().user;
          if (currentUser) {
            // Import sessionStore dynamically to avoid circular dependency
            const { useSessionStore } = await import('./sessionStore');
            const { clearSessionData, clearInactivityTimer } = useSessionStore.getState();

            // Clear session state
            clearSessionData();
            clearInactivityTimer();
          }

          await signOut();
          set({
            user: null,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error('Error logging out:', error);
          throw error;
        }
      },
    }),
    {
      name: 'user-storage',
      // Don't persist isLoading
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
