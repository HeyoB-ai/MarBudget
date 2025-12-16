import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Helper to get and clean env vars
  const getEnv = (keys: string[]) => {
    for (const key of keys) {
      const val = env[key] || process.env[key];
      if (val) return val.trim();
    }
    return '';
  };

  // Resolve variables from various possible sources
  const supabaseUrl = getEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL']);
  // Support VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, and common mistake SUPABASE_KEY
  const supabaseKey = getEnv(['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY', 'SUPABASE_KEY']);
  const googleKey = getEnv(['VITE_API_KEY', 'VITE_GOOGLE_API_KEY', 'API_KEY', 'GOOGLE_API_KEY']);
  
  console.log(`Build config: 
    - Supabase URL found: ${!!supabaseUrl}
    - Supabase Key found: ${!!supabaseKey ? 'Yes (Length: ' + supabaseKey.length + ')' : 'No'}
    - Google Key found: ${!!googleKey}
  `);

  const appConfig = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey,
    VITE_GOOGLE_API_KEY: googleKey
  };

  return {
    plugins: [react()],
    define: {
      // Inject the config object globally. 
      __APP_CONFIG__: JSON.stringify(appConfig),
      
      // Safety: Prevent process.env crashes in browser
      'process.env': {}
    },
  };
});