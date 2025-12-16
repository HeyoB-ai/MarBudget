import { createClient } from '@supabase/supabase-js';

// We use the global __APP_CONFIG__ injected by Vite
const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };

const envUrl = config.VITE_SUPABASE_URL;
const envKey = config.VITE_SUPABASE_ANON_KEY;

// Helper to clean keys (remove quotes if accidentally pasted in env vars, remove whitespace)
const cleanVar = (str: string) => {
  if (!str) return '';
  return str.trim().replace(/^["']|["']$/g, ''); // Removes start/end quotes
};

// Fallback logic
const supabaseUrl = (envUrl && envUrl !== "undefined" && envUrl.length > 0) ? cleanVar(envUrl) : 'https://placeholder.supabase.co';
const supabaseAnonKey = (envKey && envKey !== "undefined" && envKey.length > 0) ? cleanVar(envKey) : 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.warn("⚠️ Supabase is not configured correctly.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});