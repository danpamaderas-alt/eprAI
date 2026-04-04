import { createClient } from '@supabase/supabase-js';

// 1. Extraemos las llaves desde las variables de entorno (Blindaje de seguridad)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Validación extrema: Si faltan las llaves, el sistema detiene la ejecución con un aviso claro
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '🚨 ERROR DE CONFIGURACIÓN: Faltan las llaves de Supabase en el archivo .env. ' +
    'Asegúrate de haber creado el archivo .env en la raíz del proyecto.'
  );
}

// 3. Creación del cliente con configuración de persistencia robusta
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Mantiene la sesión iniciada al cerrar el navegador
    autoRefreshToken: true, // Renueva las llaves de seguridad automáticamente
    detectSessionInUrl: true // Necesario para futuras funciones de "Olvidé mi contraseña"
  }
});

// Log de confirmación (Solo visible en desarrollo)
if (import.meta.env.DEV) {
  console.log('✅ Conexión con la Bóveda de Supabase establecida.');
}