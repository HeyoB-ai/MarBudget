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
      
      // Essential: Ensure process.env.API_KEY is available for the Gemini SDK
      'process.env.API_KEY': JSON.stringify(googleKey),
      
      // Safety: Prevent process.env crashes in browser while keeping the API_KEY accessible
      'process.env': {
        API_KEY: googleKey
      }
    },
  };
});