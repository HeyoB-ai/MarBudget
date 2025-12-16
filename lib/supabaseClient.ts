import { createClient } from '@supabase/supabase-js';

// Access environment variables injected via Vite's 'define' plugin.
// If these are missing in the environment, they will be empty strings.
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!envUrl || !envKey) {
  console.warn("⚠️ LET OP: Supabase URL of Key ontbreekt! De app werkt in demo-modus en kan geen data opslaan.");
}

// Fallback to placeholder to prevent "supabaseUrl is required" crash during app initialization
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);