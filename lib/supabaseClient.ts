import { createClient } from '@supabase/supabase-js';

// Veilige toegang tot environment variables
// We gebruiken (import.meta.env || {}) om te voorkomen dat de app crasht als env undefined is
const env = (import.meta.env || {}) as any;

const envUrl = env.VITE_SUPABASE_URL;
const envKey = env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!envUrl || !envKey) {
  console.warn("⚠️ LET OP: Supabase URL of Key ontbreekt! De app werkt mogelijk niet correct.");
}

// Fallback to placeholder to prevent crash during initialization if envs are missing
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);