import { createClient } from '@supabase/supabase-js';

// We use the global __APP_CONFIG__ injected by Vite (see vite.config.ts)
// This avoids issues with import.meta.env being undefined in some contexts
const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };

const envUrl = config.VITE_SUPABASE_URL;
const envKey = config.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!envUrl || !envKey || envUrl === "undefined") {
  console.warn("⚠️ LET OP: Supabase URL of Key ontbreekt! De app werkt mogelijk niet correct.");
}

// Fallback logic
const supabaseUrl = (envUrl && envUrl !== "undefined" && envUrl.length > 0) ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = (envKey && envKey !== "undefined" && envKey.length > 0) ? envKey : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);