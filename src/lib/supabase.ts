import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Excepción técnica sin revelar estructura de archivos (ej. .env)
  throw new Error('FATAL_ERROR: Client infrastructure configuration missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // [SEGURIDAD] Explicitar el storage permite en el futuro inyectar  
    // un CustomStorageAdapter (ej. para cifrar los tokens en memoria o usar cookies)
    storage: window.localStorage 
  }
});

// Logs de telemetría solo en entorno de desarrollo. Uso de console.info en lugar de log.
if (import.meta.env.DEV) {
  console.info('[Identity Provider] Supabase client initialized.');
}