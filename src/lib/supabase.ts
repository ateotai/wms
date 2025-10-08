import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jffaljgvdigkyxjksnot.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZmFsamd2ZGlna3l4amtzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDEwODMsImV4cCI6MjA3NTAxNzA4M30.W6JVxYFn226MhuIXwa8aP-cLHIhunKyLOdtXNQ2NHLA';

// Crear cliente sin usar características de autenticación (sin sesión ni auto-refresh)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});