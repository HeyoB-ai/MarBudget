import { createClient } from '@supabase/supabase-js';

// Access environment variables injected via Vite's 'define' plugin
// This avoids issues where import.meta.env might be undefined in certain environments
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL of Key ontbreekt in environment variables!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');