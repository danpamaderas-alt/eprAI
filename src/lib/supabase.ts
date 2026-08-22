import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://gjzvdepevoviygrcdwqj.supabase.co';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqenZkZXBldm92aXlncmNkd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxODQ3MzIsImV4cCI6MjA5Mjc2MDczMn0.T-iHDZ1na7JVuxE9eM7Q5HemYyoFU57OgoqE831KUl0';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('FATAL_ERROR: Client infrastructure configuration missing.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-application-name': 'erp-raices-3.0' }
  }
});

/**
 * Verifica la conexión activa con Supabase.
 * Útil para mostrar indicadores de estado de red (Online/Offline) en la UI.
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
};
