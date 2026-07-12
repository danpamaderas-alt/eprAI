import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
