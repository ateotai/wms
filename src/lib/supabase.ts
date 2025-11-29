import { createClient } from '@supabase/supabase-js';

// Usa exclusivamente las variables de entorno reales.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  // Falla rápido y de forma visible si faltan claves, para no ocultar problemas de conexión
  console.error('Faltan variables de entorno de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl as string, supabaseKey as string, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});