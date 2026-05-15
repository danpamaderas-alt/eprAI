import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';

// 1. Inyección estricta de variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 2. Validación de infraestructura (Fail-Fast)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('FATAL_ERROR: Client infrastructure configuration missing.');
}

// 3. Cliente tipado con el esquema autogenerado <Database>
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