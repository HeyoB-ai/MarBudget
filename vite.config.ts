import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Resolve variables from various possible sources (VITE_ prefixed or not)
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const googleKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';
  
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
      // JSON.stringify ensures it's inserted as a valid JS object literal.
      __APP_CONFIG__: JSON.stringify(appConfig),
      
      // Safety: Prevent process.env crashes in browser
      'process.env': {}
    },
  };
});