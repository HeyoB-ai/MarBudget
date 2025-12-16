import { createClient } from '@supabase/supabase-js';

// We use the global __APP_CONFIG__ injected by Vite
const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };

const envUrl = config.VITE_SUPABASE_URL;
const envKey = config.VITE_SUPABASE_ANON_KEY;

// Fallback logic
const supabaseUrl = (envUrl && envUrl !== "undefined" && envUrl.length > 0) ? envUrl : 'https://placeholder.supabase.co';
// Ensure we trim whitespace which can cause 401 errors
const supabaseAnonKey = (envKey && envKey !== "undefined" && envKey.length > 0) ? envKey.trim() : 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.warn("⚠️ Supabase is not configured correctly.");
} else {
  // Safe logging for debugging (first 5 chars)
  console.log(`Supabase Client Initialized: ${supabaseUrl.substring(0, 15)}... | Key: ${supabaseAnonKey.substring(0, 5)}...`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);