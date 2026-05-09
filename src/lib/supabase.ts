import { createClient } from '@supabase/supabase-js';

// 🚀 OPTIMIZACIÓN: Tipado estricto para evitar advertencias de TypeScript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Excepción técnica sin revelar estructura de archivos (ej. .env)
  throw new Error('FATAL_ERROR: Client infrastructure configuration missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 🚀 SEGURIDAD/ESTABILIDAD: Evitamos que explote si window no existe (ej. pruebas automatizadas o SSR)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  // 🚀 MONITOREO: Etiquetamos las consultas en la base de datos para diagnosticar rendimiento
  global: {
    headers: { 'x-application-name': 'erp-raices-3.0' }
  }
});

// Logs de telemetría solo en entorno de desarrollo.
if (import.meta.env.DEV) {
  console.info('[Identity Provider] Supabase client initialized.');
}