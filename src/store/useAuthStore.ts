import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  isInitialized: boolean;

  initialize: () => () => void;
  signOut: () => Promise<void>;
}

const useMockAuth = import.meta.env.VITE_MOCK_AUTH === 'true';

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@local.test',
  user_metadata: { role: 'Administrador' },
} as unknown as User;

const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: MOCK_USER,
} as unknown as Session;

export const useAuthStore = create<AuthState>((set) => ({
  session: useMockAuth ? MOCK_SESSION : null,
  user: useMockAuth ? MOCK_USER : null,
  userRole: useMockAuth ? 'Administrador' : null,
  isInitialized: false,

  initialize: () => {
    if (useMockAuth) {
      set({
        session: MOCK_SESSION,
        user: MOCK_USER,
        userRole: 'Administrador',
        isInitialized: true,
      });
      return () => {};
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        userRole: session?.user?.user_metadata?.['role'] ?? null,
        isInitialized: true,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        userRole: session?.user?.user_metadata?.['role'] ?? null,
        isInitialized: true,
      });
    });

    return () => subscription.unsubscribe();
  },

  signOut: async () => {
    if (useMockAuth) {
      set({ session: null, user: null, userRole: null });
      return;
    }
    await supabase.auth.signOut();
    set({ session: null, user: null, userRole: null });
  },
}));
