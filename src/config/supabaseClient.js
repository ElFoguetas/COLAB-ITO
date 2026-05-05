import { createClient } from '@supabase/supabase-js';

// Importamos las variables de entorno de Vite de manera segura
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializamos y exportamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);